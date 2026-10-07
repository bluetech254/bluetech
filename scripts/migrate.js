import postgres from 'postgres';
import { readFileSync } from 'fs';

// All credentials must be set in environment — never hardcoded.
// Copy .env.example to .env and fill in values before running.
const DB_HOST     = process.env.DB_HOST;
const DB_PORT     = parseInt(process.env.DB_PORT || '5432', 10);
const DB_NAME     = process.env.DB_NAME     || 'postgres';
const DB_USER     = process.env.DB_USER     || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD;

if (!DB_HOST || !DB_PASSWORD) {
  console.error('❌ Missing required env vars: DB_HOST and DB_PASSWORD must be set.');
  console.error('   Copy .env.example to .env and fill in your Supabase DB credentials.');
  process.exit(1);
}

const sql = postgres({
  host:     DB_HOST,
  port:     DB_PORT,
  database: DB_NAME,
  username: DB_USER,
  password: DB_PASSWORD,
  ssl: 'require',
  connection: {
    application_name: 'bluetech_migration'
  }
});

async function migrate() {
  try {
    console.log('🚀 Running database migrations...');
    
    const schema = readFileSync('./supabase/001_schema.sql', 'utf8');
    
    await sql.unsafe(schema);
    
    console.log('✅ Database schema created successfully!');
    console.log('✅ Delivery zones seeded!');
    console.log('\n📊 Tables created:');
    console.log('  - users');
    console.log('  - products');
    console.log('  - bookings');
    console.log('  - orders');
    console.log('  - order_items');
    console.log('  - delivery_zones');
    
    await sql.end();
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

migrate();
