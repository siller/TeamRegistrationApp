import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ciweenyyydsfpkmnuszk.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpd2Vlbnl5eWRzZnBrbW51c3prIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5NDg0NzYsImV4cCI6MjA2NjUyNDQ3Nn0.svJv-OYaxkje-55U_SAB403CCiYdyJsYaWGX6w8XJu8'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
