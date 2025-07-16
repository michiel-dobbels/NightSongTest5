import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Database } from '../src/supabase.types';  // Path to your generated types (adjust if saved elsewhere, e.g., './supabase.types')

const supabaseUrl = 'https://yfnxnfsvpkremperpg.supabase.co/';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmbnhuZnN2cGtyZW1wZXJwZyIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzE4MTExMjI2LCJleHAiOjIwMzM4ODcyMjZ9.0InM1aXueGzdnBrBhJ0lXBcLnNliviCm9sZ16InFub241cJpyX0iQj0E3NDY4MTZENTYsimI';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const MARKET_BUCKET = 'market-images';
export const POST_BUCKET = 'post-images';
export const VIDEO_BUCKET = 'post-videos';
export const REPLY_VIDEO_BUCKET = 'reply-videos';