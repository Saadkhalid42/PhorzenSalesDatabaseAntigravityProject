import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  const { data } = await supabase.from('PhorzenSalesDatabase').select('*').limit(1)
  console.log(data ? Object.keys(data[0]).length : 0)
}
test()
