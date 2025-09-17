
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// --- ACTION REQUIRED ---
// Replace these placeholder values with your actual Supabase project URL and Anon Key.
// You can find these in your Supabase project's dashboard under Settings > API.
const supabaseUrl = "https://pwswrcmhlfrskrhkpyuz.supabase.co"; // <-- REPLACE WITH YOUR URL
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3c3dyY21obGZyc2tyaGtweXV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNjIzMTYsImV4cCI6MjA3MzYzODMxNn0.MrIbxwrgy74L_Uyd2zLCaFctF-MwNgUYFu3rrg2CiMQ"; // <-- REPLACE WITH YOUR ANON KEY

let supabase: SupabaseClient;
let supabaseInitializationError: string | null = null;

// This check identifies if the placeholder credentials are still being used.
if (supabaseUrl.includes("YOUR_SUPABASE_URL") || supabaseAnonKey.includes("YOUR_SUPABASE_ANON_KEY")) {
  supabaseInitializationError = "Supabase credentials have not been configured. Please update supabaseClient.ts with your project's URL and Anon Key.";
  // Create a dummy client to avoid crashing other parts of the app that import it.
  // The app's main component will catch the error and prevent execution.
  supabase = { from: () => supabase } as any; 
} else {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  } catch (e: any) {
    supabaseInitializationError = `Error initializing Supabase client: ${e.message}`;
    supabase = { from: () => supabase } as any;
  }
}

export { supabase, supabaseInitializationError, supabaseUrl as configuredSupabaseUrl };