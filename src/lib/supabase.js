import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://edbnwozrgynvkhzpfvob.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkYm53b3pyZ3ludmtoenBmdm9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NTI4NjIsImV4cCI6MjA4OTMyODg2Mn0.91R3FbbaVAucYnStASZaHI-Anq2smVj-Nyykmml842o'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
