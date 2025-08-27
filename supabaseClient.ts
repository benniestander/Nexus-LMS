import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://ajvfpnqhmhpuxkfwxpuo.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqdmZwbnFobWhwdXhrZnd4cHVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyNzI3MjEsImV4cCI6MjA3MTg0ODcyMX0.XLPSXKqsbHj_fUXLjnLB4xsqoI-BeS0KpOZATzJV7A0";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);