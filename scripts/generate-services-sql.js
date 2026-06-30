import { readFileSync, writeFileSync } from 'fs';
import { parse } from 'csv-parse/sync';

// Read services CSV
const servicesCSV = readFileSync('./services.csv', 'utf8');
const services = parse(servicesCSV, { columns: true, skip_empty_lines: true });

// Generate SQL
let sql = '-- Create repair_services table and import all services\n\n';

sql += `CREATE TABLE IF NOT EXISTS repair_services (
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
);

`;

sql += 'INSERT INTO repair_services (service_id, service_name, service_category, short_description, long_description, base_price, duration, activities, warranty, is_active) VALUES\n';

const values = services.map((service, index) => {
  const serviceId = service.serviceId.replace(/'/g, "''");
  const serviceName = service.serviceName.replace(/'/g, "''");
  const serviceCategory = service.serviceCategory.replace(/'/g, "''");
  const shortDesc = service.shortDescription.replace(/'/g, "''");
  const longDesc = service.longDescription.replace(/'/g, "''");
  const basePrice = parseFloat(service.basePrice);
  const duration = service.duration.replace(/'/g, "''");
  const activities = service.activities.replace(/'/g, "''");
  const warranty = service.warranty.replace(/'/g, "''");
  
  const comma = index === services.length - 1 ? ';' : ',';
  
  return `('${serviceId}', '${serviceName}', '${serviceCategory}', '${shortDesc}', '${longDesc}', ${basePrice}, '${duration}', '${activities}', '${warranty}', true)${comma}`;
});

sql += values.join('\n');

// Write to file
writeFileSync('./supabase/004_seed_services.sql', sql);

console.log(`✅ Generated SQL for ${services.length} repair services`);
console.log('📄 File: supabase/004_seed_services.sql');
