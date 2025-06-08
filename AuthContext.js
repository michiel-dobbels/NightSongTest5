import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { supabase } from './lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null); // 🧠 includes username
  const [loading, setLoading] = useState(true);
  const [profileImageUri, setProfileImageUriState] = useState(null);
  const [bannerImageUri, setBannerImageUriState] = useState(null);
  const [myPosts, setMyPosts] = useState([]);

  // Helper ensures a profile exists for the given user so posts can
  // reference it without foreign-key errors
  const ensureProfile = async (authUser) => {
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

  // 🔁 Refresh session on mount
  useEffect(() => {
    const getSession = async () => {
      // supabase-js v1 exposes `session()` to fetch the current session
      const session = supabase.auth.session();
      setUser(session?.user ?? null);

      if (session?.user) {
        // Ensure a profile exists so posting doesn't hit foreign-key errors
        await ensureProfile(session.user);
      }

      setLoading(false);
    };

    getSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        // Refresh or create the profile for consistent posting
        ensureProfile(session.user);
      } else {
        setProfile(null);
      }
    });

    return () => {
      if (listener?.subscription) {
        listener.subscription.unsubscribe();
      } else {
        listener?.unsubscribe?.();
      }
    };
  }, []);

  useEffect(() => {
    const loadImage = async () => {
      const authUser = user ?? supabase.auth.user();
      if (!authUser) return;

      const profileKey = `profile_image_uri_${authUser.id}`;
      const bannerKey = `banner_image_uri_${authUser.id}`;

      const stored = await AsyncStorage.getItem(profileKey);
      if (stored) setProfileImageUriState(stored);

      const bannerStored = await AsyncStorage.getItem(bannerKey);
      if (bannerStored) setBannerImageUriState(bannerStored);
    };
    loadImage();
    fetchMyPosts();
  }, [user]);

  // 🔐 Sign in
  async function signIn(email, password) {
    const { user, error } = await supabase.auth.signIn({
      email,
      password,
    });

    if (user) {
      // Immediately store the authenticated user
      setUser(user);

      // Create/load the profile so posts have the foreign key ready
      await ensureProfile(user);
    }

    return { error };
  }

  // 🔐 Sign up
  const signUp = async (email, password, username, name) => {
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
  };

  const setProfileImageUri = async (uri) => {
    setProfileImageUriState(uri);
    const authUser = supabase.auth.user();
    const id = authUser?.id || user?.id;
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
  };

  const setBannerImageUri = async (uri) => {
    setBannerImageUriState(uri);
    const authUser = supabase.auth.user();
    const id = authUser?.id || user?.id;
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
  };

  const fetchMyPosts = useCallback(async () => {
    const id = user?.id;
    if (!id) {
      setMyPosts([]);
      return;
    }
    const { data, error } = await supabase
      .from('posts')
      .select('id, content, created_at, reply_count, like_count')
      .eq('user_id', id)
      .order('created_at', { ascending: false });
    if (!error && data) {
      setMyPosts(prev => {
        const temps = prev.filter(p => String(p.id).startsWith('temp-'));
        const merged = [...temps, ...data];
        const seen = new Set();
        return merged.filter(p => {
          if (seen.has(p.id)) return false;
          seen.add(p.id);
          return true;
        });
      });
    }

  }, [user]);

  const addPost = (post) => {
    setMyPosts(prev => {
      const withoutDuplicate = prev.filter(p => p.id !== post.id);
      return [post, ...withoutDuplicate];
    });
  };

  const updatePost = (tempId, updated) => {
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
  };


  // 🔍 Fetch profile by ID
  const fetchProfile = async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!error && data) {
      const authUser = supabase.auth.user();
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
    fetchMyPosts,
    addPost,
    updatePost,

    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
