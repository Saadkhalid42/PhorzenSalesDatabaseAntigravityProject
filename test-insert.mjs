import { createClient } from '@supabase/supabase-js'

const url = 'https://qzdegmhtrjzllmuvuplb.supabase.co'
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6ZGVnbWh0cmp6bGxtdXZ1cGxiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODc1NTgxMCwiZXhwIjoyMDk0MzMxODEwfQ.GoHjoMnY3wATiGasB7ha9J-zq0_mY6pFnSqMbygCzzk'

const supabase = createClient(url, key)

async function run() {
  const { data, error } = await supabase.from('rows').insert([
    {
      table_id: crypto.randomUUID(),
      data_jsonb: { test: 'data' }
    }
  ]).select()
  console.log('Error:', error)
  console.log('Data:', data)
}
run()
