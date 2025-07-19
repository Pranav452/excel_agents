import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface ExcelFile {
  id: string
  name: string
  size: number
  uploaded_at: string
  user_id?: string
}

export interface Worksheet {
  id: string
  file_id: string
  name: string
  data: any[]
  headers: string[]
  row_count: number
  created_at: string
}

export interface QueryResult {
  id: string
  file_id: string
  worksheet_id: string
  query: string
  result: any
  sql_generated: string
  created_at: string
} 