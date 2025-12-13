import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://fenlowgtcertbpyhletm.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlbmxvd2d0Y2VydGJweWhsZXRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1NzUzNDcsImV4cCI6MjA4MTE1MTM0N30.LbChq9lRpO-A4PdET64JD2Z362zpMxlhqCK8oKhggFU'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

