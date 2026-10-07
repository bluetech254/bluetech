import postgres from 'postgres';
import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';

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
    application_name: 'bluetech_seed'
  }
});

async function seedProducts() {
  try {
    console.log('📦 Seeding products...');
    
    const productsCSV = readFileSync('./products.csv', 'utf8');
    const products = parse(productsCSV, { columns: true, skip_empty_lines: true });
    
    let count = 0;
    for (const product of products) {
      await sql`
        INSERT INTO products (title, description, price, image_url, specifications, is_active, stock_quantity)
        VALUES (
          ${product.name},
          ${product.description},
          ${parseFloat(product.price)},
          ${product.imageUrl},
          ${JSON.stringify({ brand: product.brand, category: product.category })},
          true,
          10
        )
      `;
      count++;
    }
    
    console.log(`✅ Imported ${count} products`);
  } catch (error) {
    console.error('❌ Product seed failed:', error.message);
  }
}

async function seedServices() {
  try {
    console.log('🔧 Creating services reference table...');
    
    // Create a services table for reference (not in original schema but useful)
    await sql`
      CREATE TABLE IF NOT EXISTS repair_services (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        service_id VARCHAR(50) UNIQUE NOT NULL,
        service_name VARCHAR(255) NOT NULL,
        service_category VARCHAR(100) NOT NULL,
        short_description TEXT,
        long_description TEXT,
        base_price DECIMAL(10,2) NOT NULL,
        duration VARCHAR(50),
        activities JSONB,
        warranty VARCHAR(100),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    
    const servicesCSV = readFileSync('./services.csv', 'utf8');
    const services = parse(servicesCSV, { columns: true, skip_empty_lines: true });
    
    let count = 0;
    for (const service of services) {
      await sql`
        INSERT INTO repair_services (
          service_id, service_name, service_category, short_description, 
          long_description, base_price, duration, activities, warranty, is_active
        )
        VALUES (
          ${service.serviceId},
          ${service.serviceName},
          ${service.serviceCategory},
          ${service.shortDescription},
          ${service.longDescription},
          ${parseFloat(service.basePrice)},
          ${service.duration},
          ${service.activities},
          ${service.warranty},
          true
        )
      `;
      count++;
    }
    
    console.log(`✅ Imported ${count} repair services`);
  } catch (error) {
    console.error('❌ Services seed failed:', error.message);
  }
}

async function seed() {
  console.log('🚀 Starting data import...\n');
  
  await seedProducts();
  await seedServices();
  
  console.log('\n✨ Seeding complete!');
  await sql.end();
}

seed();
