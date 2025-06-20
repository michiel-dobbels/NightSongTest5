import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://yfiynxfsvpklremperpg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmaXlueGZzdnBrbHJlbXBlcnBnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4MTEzNTYsImV4cCI6MjA2MjM4NzM1Nn0.1sLJqsSwKKrUuJS6ln4UFoNCBssFlhGisZCsSt09x5o';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
export const MARKET_BUCKET = 'market-images';
export const POST_BUCKET = 'post-images';
export const POST_VIDEO_BUCKET = 'post-videos';
export const REPLY_VIDEO_BUCKET = 'reply-videos';

