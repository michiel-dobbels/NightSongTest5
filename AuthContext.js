import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PROFILE_IMAGE_KEY_PREFIX = 'profile_image_uri_';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null); // 🧠 includes username
  const [loading, setLoading] = useState(true);
  const [profileImageUri, setProfileImageUriState] = useState(null);

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
    const defaultDisplayName =
      authUser.user_metadata?.display_name ||
      defaultUsername;


    // Create a new profile with the provided or derived username

    let { error } = await supabase
      .from('profiles')
      .upsert(
        {
          id: authUser.id,
          username: defaultUsername,
          display_name: defaultDisplayName,
        },
        { onConflict: 'id' }
      );

    if (error?.code === 'PGRST204') {
      // Retry without the display_name column if the schema cache doesn't know it
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
      display_name: defaultDisplayName,
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
      listener?.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const loadImage = async () => {
      if (user?.id) {
        const key = `${PROFILE_IMAGE_KEY_PREFIX}${user.id}`;
        const stored = await AsyncStorage.getItem(key);
        if (stored) {
          setProfileImageUriState(stored);
        } else if (profile?.avatar_url) {
          setProfileImageUriState(profile.avatar_url);
          await AsyncStorage.setItem(key, profile.avatar_url);
        } else {
          setProfileImageUriState(null);
        }
      } else {
        setProfileImageUriState(null);
      }
    };
    loadImage();
  }, [user, profile]);

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
  const signUp = async (email, password, username, displayName) => {
    if (!username || !displayName) {
      return { error: { message: 'Username and name are required' } };

    }


    const { user: newUser, session, error } = await supabase.auth.signUp(
      { email, password },
      { data: { username, display_name: displayName } }

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
    if (user?.id) {
      await AsyncStorage.removeItem(`${PROFILE_IMAGE_KEY_PREFIX}${user.id}`);
    }
  };

  const AVATAR_BUCKET = 'avatars';

  const setProfileImageUri = async (uri) => {
    if (!user) {
      setProfileImageUriState(uri);
      return;
    }

    const key = `${PROFILE_IMAGE_KEY_PREFIX}${user.id}`;
    if (uri) {
      try {
        setProfileImageUriState(uri);
        const res = await fetch(uri);
        const blob = await res.blob();
        const ext = uri.split('.').pop() || 'jpg';
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error } = await supabase.storage
          .from(AVATAR_BUCKET)
          .upload(path, blob, { upsert: true });
        if (!error) {
          const { publicURL } = supabase.storage
            .from(AVATAR_BUCKET)
            .getPublicUrl(path).data;
          await supabase
            .from('profiles')
            .update({ avatar_url: publicURL })
            .eq('id', user.id);
          await AsyncStorage.setItem(key, publicURL);
          setProfileImageUriState(publicURL);
        }
      } catch (e) {
        console.error('Failed to upload avatar', e);
      }
    } else {
      setProfileImageUriState(null);
      await AsyncStorage.removeItem(key);
      await supabase.from('profiles').update({ avatar_url: null }).eq('id', user.id);
    }
  };

  const uploadAvatar = async (uri) => {
    if (!user) return;
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const path = `${user.id}/${Date.now()}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { upsert: true });
      if (uploadError) throw uploadError;
      const { publicURL } = supabase.storage
        .from('avatars')
        .getPublicUrl(path);
      await supabase.from('profiles').update({ avatar_url: publicURL }).eq('id', user.id);
      await setProfileImageUri(publicURL);
    } catch (err) {
      console.error('Failed to upload avatar', err);
    }
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
        display_name:
          data.display_name || meta.display_name || data.username || meta.username,
      };
      setProfile(profileData);
      if (profileData.avatar_url) {
        setProfileImageUriState(profileData.avatar_url);
        await AsyncStorage.setItem('profile_image_uri', profileData.avatar_url);

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
    uploadAvatar,
    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
