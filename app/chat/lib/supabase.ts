import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://yfiynxfsvpklremperpg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmaXlueGZzdnBrbHJlbXBlcnBnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4MTEzNTYsImV4cCI6MjA2MjM4NzM1Nn0.1sLJqsSwKKrUuJS6ln4UFoNCBssFlhGisZCsSt09x5o';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
