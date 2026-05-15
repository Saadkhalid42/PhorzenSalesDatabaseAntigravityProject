import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, table_id, rows, updates, deletes, query } = body
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    if (action === 'query') {
      let sbQuery = supabase.from('rows').select('*').eq('table_id', table_id)
      
      // Simple filtering logic if needed can be passed, or we just return all rows for this table_id
      // and do local filtering if preferred. For large datasets, server-side is better.
      const { data, error } = await sbQuery
      
      if (error) throw error
      return NextResponse.json({ data })
    }
    if (action === 'create_table') {
      // Default workspace id used in this app instance
      const workspace_id = 'e7e421e1-9aa2-42f7-909e-be4c484821f4'
      const { data, error } = await supabase.from('tables').insert([{ id: table_id, name: body.name, workspace_id }]).select()
      if (error) throw error
      return NextResponse.json({ data })
    }
    
    if (action === 'insert') {
      const { data, error } = await supabase.from('rows').insert(rows).select()
      if (error) throw error
      return NextResponse.json({ data })
    }
    
    if (action === 'update') {
      const { data, error } = await supabase.from('rows').update(updates.data_jsonb).eq('id', updates.id).select()
      if (error) throw error
      return NextResponse.json({ data })
    }
    
    if (action === 'delete') {
      const { error } = await supabase.from('rows').delete().in('id', deletes)
      if (error) throw error
      return NextResponse.json({ success: true })
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('Data API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
