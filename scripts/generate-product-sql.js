import { readFileSync, writeFileSync } from 'fs';
import { parse } from 'csv-parse/sync';

// Read products CSV
const productsCSV = readFileSync('./products.csv', 'utf8');
const products = parse(productsCSV, { columns: true, skip_empty_lines: true });

// Generate SQL INSERT statements
let sql = '-- Import all products from products.csv\n\n';
sql += 'INSERT INTO products (title, description, price, image_url, specifications, is_active, stock_quantity) VALUES\n';

const values = products.map((product, index) => {
  const title = product.name.replace(/'/g, "''");
  const description = product.description.replace(/'/g, "''");
  const price = parseFloat(product.price);
  const imageUrl = product.imageUrl.replace(/'/g, "''");
  const specs = JSON.stringify({ brand: product.brand, category: product.category }).replace(/'/g, "''");
  
  const comma = index === products.length - 1 ? ';' : ',';
  
  return `('${title}', '${description}', ${price}, '${imageUrl}', '${specs}', true, 10)${comma}`;
});

sql += values.join('\n');

// Write to file
writeFileSync('./supabase/003_seed_products.sql', sql);

console.log(`✅ Generated SQL for ${products.length} products`);
console.log('📄 File: supabase/003_seed_products.sql');
