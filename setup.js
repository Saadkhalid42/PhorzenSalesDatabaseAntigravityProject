const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dns = require('dns');

// Force IPv4 resolution
dns.setDefaultResultOrder('ipv4first');

async function runMigration() {
  console.log('Trying to connect with family: 4...');
  const client = new Client({
    host: 'db.qzdegmhtrjzllmuvuplb.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: '@MedicalBilling1214',
    connectionTimeoutMillis: 10000,
  });
  
  try {
    await client.connect();
    console.log('Connected to Supabase Postgres database successfully!');
  } catch (err) {
    console.error('Failed to connect:', err);
    process.exit(1);
  }

  try {
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    
    console.log('Applying schema...');
    await client.query(schemaSql);
    console.log('Schema applied successfully.');
  } catch (err) {
    console.error('Error applying schema:', err);
  } finally {
    await client.end();
    console.log('Connection closed.');
  }
}

runMigration();
