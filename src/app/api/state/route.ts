import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// The unique ID of the system table created to hold the app state
const APP_STATE_TABLE_ID = 'fe3c268d-5d15-469e-91e3-d21553712b2c'

export async function GET() {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    const { data, error } = await supabase
      .from('tables')
      .select('schema_json')
      .eq('id', APP_STATE_TABLE_ID)
      .single()

    if (error) {
      console.error('Error fetching state:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // If it's empty, return null so frontend uses initial defaults
    const state = Object.keys(data?.schema_json || {}).length > 0 ? data.schema_json : null
    
    return NextResponse.json({ state })
  } catch (error: any) {
    console.error('State GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { state } = body

    if (!state) {
      return NextResponse.json({ error: 'No state provided' }, { status: 400 })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    const { error } = await supabase
      .from('tables')
      .update({ schema_json: state })
      .eq('id', APP_STATE_TABLE_ID)

    if (error) {
      console.error('Error saving state:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('State POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
