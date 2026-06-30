import postgres from 'postgres';
import { readFileSync } from 'fs';

const sql = postgres({
  host: 'db.ureebvpesbkbholidlrn.supabase.co',
  port: 5432,
  database: 'postgres',
  username: 'postgres',
  password: 'J7mDuB$J%P*VGtx',
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
