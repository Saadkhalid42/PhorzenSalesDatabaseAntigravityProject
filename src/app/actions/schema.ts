'use server'

import { Pool } from 'pg'

const TABLE_NAME = '"PhorzenSalesDatabase"'

// Initialize pool only if DATABASE_URL is present
let pool: Pool | null = null
if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  })
}

function getPool() {
  if (!pool) {
    throw new Error('DATABASE_URL is not configured in .env.local. Cannot perform schema modifications.')
  }
  return pool
}

export async function addColumn(name: string, type: string) {
  try {
    const db = getPool()
    let pgType = 'text'
    if (type === 'Type: Number') pgType = 'numeric'
    if (type === 'Type: Boolean') pgType = 'boolean'
    if (type === 'Type: Date') pgType = 'date'
    
    // Using string interpolation for DDL since parameterized queries don't support identifiers in pg
    await db.query(`ALTER TABLE ${TABLE_NAME} ADD COLUMN "${name}" ${pgType};`)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteColumn(name: string) {
  try {
    const db = getPool()
    await db.query(`ALTER TABLE ${TABLE_NAME} DROP COLUMN "${name}";`)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function renameColumn(oldName: string, newName: string) {
  try {
    const db = getPool()
    await db.query(`ALTER TABLE ${TABLE_NAME} RENAME COLUMN "${oldName}" TO "${newName}";`)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function changeColumnType(name: string, newType: string) {
  try {
    const db = getPool()
    let pgType = 'text'
    if (newType === 'Type: Number') pgType = 'numeric USING "${name}"::numeric'
    if (newType === 'Type: Boolean') pgType = 'boolean USING "${name}"::boolean'
    if (newType === 'Type: Date') pgType = 'date USING "${name}"::date'

    // Requires USING clause to cast existing data
    await db.query(`ALTER TABLE ${TABLE_NAME} ALTER COLUMN "${name}" TYPE ${pgType};`)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
