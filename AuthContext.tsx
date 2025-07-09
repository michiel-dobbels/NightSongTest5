import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { postEvents } from './app/postEvents';
import { likeEvents } from './app/likeEvents';
import { replyEvents } from './app/replyEvents';
import { Post } from './types/Post';
import { getOrCreateChatKeys } from './lib/chatKeys';



export interface Profile {
  id: string;
  username: string;
  name: string | null;
  email?: string | null;
  image_url?: string | null;
}
export type ExtendedPost = Post & { liked?: boolean };
export interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  profileImageUri: string | null;
  setProfileImageUri: (uri: string | null) => Promise<void>;
  bannerImageUri: string | null;
  setBannerImageUri: (uri: string | null) => Promise<void>;
  myPosts: Post[];
  addPost: (post: Post) => void;
  updatePost: (tempId: string, updated: Partial<Post>) => void;
  removePost: (postId: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    username: string,
    name: string,
  ) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null); // 🧠 includes username
  const [loading, setLoading] = useState(true);
  const [profileImageUri, setProfileImageUriState] = useState<string | null>(null);
  const [bannerImageUri, setBannerImageUriState] = useState<string | null>(null);
  const [myPosts, setMyPosts] = useState<ExtendedPost[]>([]);

  const lastFetchedUserIdRef = useRef<string | null>(null);

  // Helper ensures a profile exists for the given user so posts can
  // reference it without foreign-key errors
  const ensureProfile = async (authUser: User | null): Promise<Profile | null> => {
    if (!authUser) return null;

    // Try to load an existing profile first
    const existing = await fetchProfile(authUser.id);
    if (existing) return existing;


    const defaultUsername =
      authUser.user_metadata?.username ||
      (authUser.email ? authUser.email.split('@')[0] : 'anonymous');
    const defaultName =
      authUser.user_metadata?.name ||
      defaultUsername;


    // Create a new profile with the provided or derived username

    let { error } = await supabase
      .from('profiles')
      .upsert(
        {
          id: authUser.id,
          username: defaultUsername,
          name: defaultName,
        },
        { onConflict: 'id' }
      );

    if (error?.code === 'PGRST204') {
      // Retry without the name column if the schema cache doesn't know it
      const retry = await supabase
        .from('profiles')
        .upsert(
          { id: authUser.id, username: defaultUsername },
          { onConflict: 'id' }
        );
      error = retry.error;
    }

    // Log any insertion error for easier debugging
    if (error) console.error('Failed to insert profile:', error);

    const profileData = {
      id: authUser.id,
      username: defaultUsername,
      name: defaultName,
      email: authUser.email,
    };

    setProfile(profileData);
    return profileData;
  };

  // 🔁 Refresh session on mount without flicker
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        const session = supabase.auth.session(); // returns the session object directly



        

        if (session?.user && isMounted) {
          setUser(session.user);
          await ensureProfile(session.user);
        }
      } catch (err) {
        console.error("Unexpected error during session init:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };


    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!isMounted) return;
        setUser(session?.user ?? null);
        if (session?.user) {
          await ensureProfile(session.user);
        } else {
          setProfile(null);
        }
      },
    );

    return () => {
      isMounted = false;
      listener?.unsubscribe?.();

    };
  }, []);

  

  const fetchMyPosts = useCallback(async () => {
    const id = user?.id;
    if (!id) {
      setMyPosts([]);
      return;
    }
    const { data, error } = await supabase
      .from('posts')
      .select(
        'id, content, image_url, username, created_at, reply_count, like_count'
      )
      .eq('user_id', id)
      .order('created_at', { ascending: false });
    if (!error && data) {
      setMyPosts(prev => {
        const prevMap = Object.fromEntries(prev.map(p => [p.id, p]));
        const temps = prev.filter(p => String(p.id).startsWith('temp-'));
        const merged = [
          ...temps,
          ...data.map(p => {
            const existing = prevMap[p.id] as ExtendedPost;

            return existing
              ? { ...p, like_count: existing.like_count, liked: existing?.liked ?? false
 }
              : p;
          }),
        ];
        const seen = new Set();
        const filtered = merged.filter(p => {
          if (seen.has(p.id)) return false;
          seen.add(p.id);
          return true;
        });

        if (JSON.stringify(prev) === JSON.stringify(filtered)) {
          return prev;
        }
        return filtered;
      });
      lastFetchedUserIdRef.current = id;
    }

  }, [user?.id]);

  useEffect(() => {
    const loadImage = async () => {
      const authUser = user;
      if (!authUser) return;

      const profileKey = `profile_image_uri_${authUser.id}`;
      const bannerKey = `banner_image_uri_${authUser.id}`;

      const stored = await AsyncStorage.getItem(profileKey);
      if (stored) setProfileImageUriState(stored);

      const bannerStored = await AsyncStorage.getItem(bannerKey);
      if (bannerStored) setBannerImageUriState(bannerStored);
    };
    loadImage();
    if (user?.id && lastFetchedUserIdRef.current !== user.id) {
      fetchMyPosts();
    }
  }, [user?.id, fetchMyPosts]);

  useEffect(() => {
    const onLikeChanged = ({
      id,
      count,
      liked,
    }: { id: string; count: number; liked: boolean }) => {

      setMyPosts(prev => {
        const found = prev.find(p => p.id === id);
        if (!found) return prev;
        const updated = prev.map(p =>
          p.id === id ? { ...p, like_count: count, liked } : p,
        );
        AsyncStorage.setItem('cached_posts', JSON.stringify(updated));
        return updated;
      });
    };
    likeEvents.on('likeChanged', onLikeChanged);
    return () => {
      likeEvents.off('likeChanged', onLikeChanged);
    };
  }, []);

  useEffect(() => {
    const onReplyAdded = (postId: string) => {

      setMyPosts(prev => {
        const found = prev.find(p => p.id === postId);
        if (!found) return prev;
        const updated = prev.map(p =>
          p.id === postId
            ? { ...p, reply_count: (p.reply_count ?? 0) + 1 }
            : p,
        );
        AsyncStorage.setItem('cached_posts', JSON.stringify(updated));
        return updated;
      });
    };
    replyEvents.on('replyAdded', onReplyAdded);
    return () => {
      replyEvents.off('replyAdded', onReplyAdded);
    };
  }, []);

  // 🔐 Sign in
  async function signIn(
    email: string,
    password: string,
  ): Promise<{ error: any }> {
    const { user, error } = await supabase.auth.signIn({
      email,
      password,
    });

    if (user) {
      // Immediately store the authenticated user
      setUser(user);

      // Create/load the profile so posts have the foreign key ready
      await ensureProfile(user);

      await getOrCreateChatKeys(user.id);
    }

    return { error };
  }

  // 🔐 Sign up
  const signUp = async (
    email: string,
    password: string,
    username: string,
    name: string,
  ): Promise<{ error: any }> => {
    if (!username || !name) {
      return { error: { message: 'Username and name are required' } };

    }


    const { user: newUser, session, error } = await supabase.auth.signUp(
      { email, password },
      { data: { username, name } }

    );

    if (error) {
      if (error.message && error.message.toLowerCase().includes('already')) {
        return await signIn(email, password);
      }

      console.error('❌ Sign up error:', error);
      return { error };
    }

    if (session) {
      setUser(session.user);
      await ensureProfile(session.user);
      await getOrCreateChatKeys(session.user.id);

      return { error: null };
    }

    // Otherwise sign in to create the profile. If sign-in fails because the
    // email needs confirmation, treat as success so the user can verify via
    // email without seeing an error.
    const { error: signInErr } = await signIn(email, password);

    if (
      signInErr &&
      signInErr.message &&
      signInErr.message.toLowerCase().includes('invalid login credentials')
    ) {
      // Account created but email confirmation pending

      return { error: null };
    }

    return { error: signInErr };
  };


  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setProfileImageUriState(null);
    setBannerImageUriState(null);
    setMyPosts([]);
    lastFetchedUserIdRef.current = null;
  };

  const setProfileImageUri = useCallback(async (uri: string | null): Promise<void> => {
    setProfileImageUriState(uri);
    const authUser = user ?? supabase.auth.session()?.user ?? null;

    const id = authUser?.id;
    const key = id ? `profile_image_uri_${id}` : 'profile_image_uri';

    if (authUser) {
      await supabase.from('profiles').update({ image_url: uri }).eq('id', authUser.id);
    }

    if (uri) {
      await AsyncStorage.setItem(key, uri);
    } else {
      await AsyncStorage.removeItem(key);
    }

    if (user && authUser !== user) {
      await supabase.from('profiles').update({ image_url: uri }).eq('id', user.id);
    }
  }, [user?.id]);

  const setBannerImageUri = useCallback(async (uri: string | null): Promise<void> => {
    setBannerImageUriState(uri);
    const authUser = user ?? supabase.auth.session()?.user ?? null;

    const id = authUser?.id;
    const key = id ? `banner_image_uri_${id}` : 'banner_image_uri';

    if (authUser) {
      const { error } = await supabase
        .from('profiles')
        .update({ banner_url: uri })
        .eq('id', authUser.id);
      if (error) console.error('Failed to update banner_url:', error);
    }

    if (uri) {
      await AsyncStorage.setItem(key, uri);
    } else {
      await AsyncStorage.removeItem(key);
    }

    if (user && authUser !== user) {
      const { error } = await supabase
        .from('profiles')
        .update({ banner_url: uri })
        .eq('id', user.id);
      if (error) console.error('Failed to update banner_url:', error);
    }
  }, [user?.id]);

  

  const addPost = useCallback((post: Post): void => {
    setMyPosts(prev => {
      const withoutDuplicate = prev.filter(p => p.id !== post.id);
      return [post, ...withoutDuplicate];
    });
  }, []);

  const updatePost = useCallback((tempId: string, updated: Partial<Post>): void => {
    setMyPosts(prev => {
      const updatedList = prev.map(p =>
        p.id === tempId ? { ...p, ...updated } : p
      );
      const seen = new Set();
      return updatedList.filter(p => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      });
    });
  }, []);

  const removePost = useCallback(async (postId: string): Promise<void> => {
    setMyPosts(prev => prev.filter(p => p.id !== postId));
    try {
      const stored = await AsyncStorage.getItem('cached_posts');
      if (stored) {
        const arr = JSON.parse(stored);
        const updated = arr.filter((p: any) => p.id !== postId);

        await AsyncStorage.setItem('cached_posts', JSON.stringify(updated));
      }
    } catch (e) {
      console.error('Failed to update cached posts', e);
    }
    postEvents.emit('postDeleted', postId);
  }, []);

  useEffect(() => {
    const onPostDeleted = (postId: string) => {

      setMyPosts(prev => prev.filter(p => p.id !== postId));
      AsyncStorage.getItem('cached_posts').then(stored => {
        if (stored) {
          try {
            const arr = JSON.parse(stored);
            const updated = arr.filter((p: any) => p.id !== postId);

            AsyncStorage.setItem('cached_posts', JSON.stringify(updated));
          } catch (e) {
            console.error('Failed to update cached posts', e);
          }
        }
      });
    };
    postEvents.on('postDeleted', onPostDeleted);
    return () => {
      postEvents.off('postDeleted', onPostDeleted);
    };
  }, []);



  // 🔍 Fetch profile by ID
  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!error && data) {
      const authUser = user ?? supabase.auth.session()?.user ?? null;

      const meta = authUser?.user_metadata || {};
      const profileData = {
        ...data,
        email: authUser?.email,
        username: data.username || meta.username || authUser?.email?.split('@')[0],
        name: data.name || meta.name || data.username || meta.username,
      };
      setProfile(profileData);
      // Restore the fetched profile image URL locally without touching the database

      const profileKey = `profile_image_uri_${userId}`;
      const bannerKey = `banner_image_uri_${userId}`;

      if (data.image_url) {
        setProfileImageUriState(data.image_url);
        AsyncStorage.setItem(profileKey, data.image_url);
      } else {
        // Fall back to any locally stored value if the database column is empty
        const storedProfile = await AsyncStorage.getItem(profileKey);
        if (storedProfile) {
          setProfileImageUriState(storedProfile);
        } else {
          setProfileImageUriState(null);
        }
      }

      if (data.banner_url) {
        setBannerImageUriState(data.banner_url);
        AsyncStorage.setItem(bannerKey, data.banner_url);
      } else {
        // Similarly restore any stored banner if Supabase doesn't have one
        const storedBanner = await AsyncStorage.getItem(bannerKey);
        if (storedBanner) {
          setBannerImageUriState(storedBanner);
        } else {
          setBannerImageUriState(null);
        }
      }

      return profileData;
    }

    return null;
  };

  const value = {
    user,
    profile,      // ⬅️ includes .username for posts
    loading,
    profileImageUri,
    setProfileImageUri,
    bannerImageUri,
    setBannerImageUri,
    myPosts,
    addPost,
    updatePost,
    removePost,

    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue | undefined {
  return useContext(AuthContext);
}
