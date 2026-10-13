#!/usr/bin/env python3
"""
seed_products.py — Seed 20 products into the BlueTech database.

Run in the cPanel "Setup Python App" terminal:

    python3 seed_products.py

- All prices set to KES 1 (update via admin panel later)
- Real product images from Unsplash (free, no auth required)
- Skips products that already exist by title (safe to re-run)
"""

import os
import sys

# ── Path setup (same pattern as other cPanel scripts) ────────────────────────

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
APP_DIR  = os.path.join(BASE_DIR, "app")

for d in (BASE_DIR, APP_DIR):
    if d not in sys.path:
        sys.path.insert(0, d)

os.chdir(BASE_DIR)

SEP = "=" * 60

def ok(msg, detail=""):   print(f"  ✓  {msg}" + (f"  —  {detail}" if detail else ""))
def fail(msg, detail=""): print(f"  ✗  {msg}" + (f"  —  {detail}" if detail else ""))
def info(msg):            print(f"  →  {msg}")


# ── Load .env ─────────────────────────────────────────────────────────────────

print(f"\n{SEP}\n  BlueTech Product Seeder\n{SEP}")
info("Loading environment...")

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(BASE_DIR, ".env"))
    ok(".env loaded")
except ImportError:
    info("python-dotenv not found — reading env vars directly")


# ── Connect to database ───────────────────────────────────────────────────────

info("Connecting to database...")

try:
    import psycopg2
except ImportError:
    import subprocess
    subprocess.run([sys.executable, "-m", "pip", "install", "psycopg2-binary", "-q"], check=True)
    import psycopg2

DB_HOST = os.environ.get("DB_HOST", "localhost")
DB_PORT = int(os.environ.get("DB_PORT", "5432"))
DB_NAME = os.environ.get("DB_NAME", "fixitblu_prod_db")
DB_USER = os.environ.get("DB_USER", "fixitblu_prod_user")
DB_PASS = os.environ.get("DB_PASSWORD", "")

conn = None
for host in [DB_HOST, "/var/run/postgresql", "localhost", "127.0.0.1"]:
    try:
        conn = psycopg2.connect(
            host=host, port=DB_PORT,
            dbname=DB_NAME, user=DB_USER, password=DB_PASS,
            connect_timeout=10,
        )
        ok("Database connected", f"host={host!r} db={DB_NAME!r}")
        break
    except Exception as e:
        info(f"trying host={host!r} ... {str(e)[:50]}")

if not conn:
    fail("Could not connect to database")
    sys.exit(1)

cur = conn.cursor()


# ── Product definitions ───────────────────────────────────────────────────────
# Images: Unsplash Source URLs (no API key needed, auto-resize supported)
# Format: https://images.unsplash.com/photo-{ID}?w=800&q=80

PRODUCTS = [
    # ── Smartphones ────────────────────────────────────────────────────────────
    {
        "title": "Samsung Galaxy S24 Ultra",
        "description": "Latest Samsung flagship with S Pen, 200MP camera, 5000mAh battery, and Snapdragon 8 Gen 3 processor. Perfect for power users.",
        "category": "Smartphones",
        "price": 1.00,
        "stock_quantity": 15,
        "image_url": "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800&q=80",
        "is_featured": True,
        "is_new": True,
        "specifications": {"brand": "Samsung", "storage": "256GB", "ram": "12GB", "color": "Titanium Black"},
    },
    {
        "title": "iPhone 15 Pro Max",
        "description": "Apple's most powerful iPhone with A17 Pro chip, titanium design, 48MP camera system, and USB-C connectivity.",
        "category": "Smartphones",
        "price": 1.00,
        "stock_quantity": 12,
        "image_url": "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&q=80",
        "is_featured": True,
        "is_bestseller": True,
        "specifications": {"brand": "Apple", "storage": "256GB", "ram": "8GB", "color": "Natural Titanium"},
    },
    {
        "title": "Tecno Camon 30 Premier",
        "description": "Premium Tecno smartphone with a 50MP RGBW front camera, 6.77-inch AMOLED display, and 5000mAh battery. Great value for money.",
        "category": "Smartphones",
        "price": 1.00,
        "stock_quantity": 20,
        "image_url": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80",
        "is_new": True,
        "specifications": {"brand": "Tecno", "storage": "256GB", "ram": "8GB", "color": "Startrail Black"},
    },
    {
        "title": "Samsung Galaxy A55 5G",
        "description": "Mid-range Samsung with 50MP OIS camera, IP67 water resistance, 5000mAh battery, and 5G connectivity.",
        "category": "Smartphones",
        "price": 1.00,
        "stock_quantity": 18,
        "image_url": "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&q=80",
        "is_bestseller": True,
        "specifications": {"brand": "Samsung", "storage": "128GB", "ram": "8GB", "color": "Awesome Navy"},
    },

    # ── Laptops ────────────────────────────────────────────────────────────────
    {
        "title": "MacBook Air M3",
        "description": "Apple's ultra-thin laptop with M3 chip, 18-hour battery life, 13.6-inch Liquid Retina display, and fanless design.",
        "category": "Laptops",
        "price": 1.00,
        "stock_quantity": 8,
        "image_url": "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80",
        "is_featured": True,
        "is_bestseller": True,
        "specifications": {"brand": "Apple", "storage": "256GB SSD", "ram": "8GB", "processor": "Apple M3"},
    },
    {
        "title": "Dell XPS 15",
        "description": "Premium Windows laptop with Intel Core i7, 15.6-inch OLED display, NVIDIA RTX 4060, and 512GB SSD.",
        "category": "Laptops",
        "price": 1.00,
        "stock_quantity": 6,
        "image_url": "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=800&q=80",
        "is_featured": True,
        "specifications": {"brand": "Dell", "storage": "512GB SSD", "ram": "16GB", "processor": "Intel Core i7-13700H"},
    },
    {
        "title": "HP Pavilion 15",
        "description": "Reliable everyday laptop with Intel Core i5, 15.6-inch FHD display, 8GB RAM, 512GB SSD. Great for students and office work.",
        "category": "Laptops",
        "price": 1.00,
        "stock_quantity": 14,
        "image_url": "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&q=80",
        "is_new": True,
        "specifications": {"brand": "HP", "storage": "512GB SSD", "ram": "8GB", "processor": "Intel Core i5-1335U"},
    },
    {
        "title": "Lenovo ThinkPad X1 Carbon",
        "description": "Business-class laptop weighing just 1.12kg with Intel Core i7, 14-inch IPS display, and military-grade durability.",
        "category": "Laptops",
        "price": 1.00,
        "stock_quantity": 5,
        "image_url": "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&q=80",
        "specifications": {"brand": "Lenovo", "storage": "512GB SSD", "ram": "16GB", "processor": "Intel Core i7-1365U"},
    },

    # ── Tablets ────────────────────────────────────────────────────────────────
    {
        "title": "iPad Pro 12.9\" M2",
        "description": "Professional tablet with M2 chip, Liquid Retina XDR display, Apple Pencil support, and Thunderbolt connectivity.",
        "category": "Tablets",
        "price": 1.00,
        "stock_quantity": 9,
        "image_url": "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&q=80",
        "is_featured": True,
        "specifications": {"brand": "Apple", "storage": "128GB", "ram": "8GB", "connectivity": "Wi-Fi + Cellular"},
    },
    {
        "title": "Samsung Galaxy Tab S9",
        "description": "Premium Android tablet with 11-inch Dynamic AMOLED display, S Pen included, IP68 water resistant, and DeX mode.",
        "category": "Tablets",
        "price": 1.00,
        "stock_quantity": 10,
        "image_url": "https://images.unsplash.com/photo-1632516643720-e7f5d7d6ecc9?w=800&q=80",
        "specifications": {"brand": "Samsung", "storage": "128GB", "ram": "8GB", "color": "Graphite"},
    },

    # ── Accessories ───────────────────────────────────────────────────────────
    {
        "title": "Samsung 65W Super Fast Charger",
        "description": "Official Samsung 65W USB-C charger with cable. Charges Galaxy S and A series phones from 0 to 50% in 20 minutes.",
        "category": "Chargers & Cables",
        "price": 1.00,
        "stock_quantity": 50,
        "image_url": "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=800&q=80",
        "is_bestseller": True,
        "specifications": {"brand": "Samsung", "wattage": "65W", "connector": "USB-C"},
    },
    {
        "title": "Apple 20W USB-C Power Adapter",
        "description": "Original Apple 20W USB-C charger. Compatible with iPhone 8 and later, iPad, and AirPods. Supports fast charging.",
        "category": "Chargers & Cables",
        "price": 1.00,
        "stock_quantity": 45,
        "image_url": "https://images.unsplash.com/photo-1601370552761-8a3d2dd33b4e?w=800&q=80",
        "is_bestseller": True,
        "specifications": {"brand": "Apple", "wattage": "20W", "connector": "USB-C"},
    },
    {
        "title": "Anker PowerCore 26800mAh Power Bank",
        "description": "High-capacity portable charger with 65W output, dual USB-C ports, charges 3 devices simultaneously. Enough for 6 phone charges.",
        "category": "Power Banks",
        "price": 1.00,
        "stock_quantity": 25,
        "image_url": "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800&q=80",
        "specifications": {"brand": "Anker", "capacity": "26800mAh", "output": "65W"},
    },
    {
        "title": "Samsung Galaxy Buds2 Pro",
        "description": "Premium wireless earbuds with Active Noise Cancellation, 360° Audio, IPX7 water resistance, and 8-hour battery life.",
        "category": "Earphones & Audio",
        "price": 1.00,
        "stock_quantity": 20,
        "image_url": "https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=800&q=80",
        "is_new": True,
        "specifications": {"brand": "Samsung", "type": "True Wireless", "anc": "Yes", "color": "Graphite"},
    },
    {
        "title": "Apple AirPods Pro (2nd Gen)",
        "description": "Apple's best earbuds with Adaptive Transparency, Personalized Spatial Audio, and up to 6 hours of listening time.",
        "category": "Earphones & Audio",
        "price": 1.00,
        "stock_quantity": 15,
        "image_url": "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=800&q=80",
        "is_bestseller": True,
        "specifications": {"brand": "Apple", "type": "True Wireless", "anc": "Yes", "color": "White"},
    },

    # ── Smart Watches ──────────────────────────────────────────────────────────
    {
        "title": "Apple Watch Series 9",
        "description": "The most advanced Apple Watch with S9 chip, Double Tap gesture, Always-On Retina display, and crash detection.",
        "category": "Smart Watches",
        "price": 1.00,
        "stock_quantity": 11,
        "image_url": "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&q=80",
        "is_featured": True,
        "specifications": {"brand": "Apple", "size": "45mm", "color": "Midnight", "connectivity": "GPS + Cellular"},
    },
    {
        "title": "Samsung Galaxy Watch 6 Classic",
        "description": "Premium Samsung smartwatch with rotating bezel, advanced sleep coaching, body composition tracking, and 40-hour battery.",
        "category": "Smart Watches",
        "price": 1.00,
        "stock_quantity": 9,
        "image_url": "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800&q=80",
        "specifications": {"brand": "Samsung", "size": "47mm", "color": "Black", "os": "Wear OS"},
    },

    # ── Cases & Protection ────────────────────────────────────────────────────
    {
        "title": "Spigen Tough Armor Phone Case",
        "description": "Military-grade drop protection with Air Cushion Technology. Available for Samsung and iPhone models. Kickstand included.",
        "category": "Cases & Protection",
        "price": 1.00,
        "stock_quantity": 60,
        "image_url": "https://images.unsplash.com/photo-1556656793-08538906a9f8?w=800&q=80",
        "is_bestseller": True,
        "specifications": {"brand": "Spigen", "material": "TPU + Polycarbonate", "protection": "Military Grade"},
    },
    {
        "title": "Tempered Glass Screen Protector (Universal Pack)",
        "description": "Pack of 2 tempered glass screen protectors. 9H hardness, anti-fingerprint coating, 99% clarity. Available for all popular models.",
        "category": "Cases & Protection",
        "price": 1.00,
        "stock_quantity": 100,
        "image_url": "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&q=80",
        "is_bestseller": True,
        "specifications": {"material": "Tempered Glass", "hardness": "9H", "pack": "2 pieces"},
    },

    # ── Storage ───────────────────────────────────────────────────────────────
    {
        "title": "Samsung 1TB Portable SSD T7",
        "description": "Ultra-fast portable SSD with 1050MB/s read speed, USB 3.2 Gen 2, password protection, and shock-resistant metal body.",
        "category": "Storage",
        "price": 1.00,
        "stock_quantity": 16,
        "image_url": "https://images.unsplash.com/photo-1531492746076-161ca9bcad58?w=800&q=80",
        "is_new": True,
        "specifications": {"brand": "Samsung", "capacity": "1TB", "interface": "USB 3.2 Gen 2", "color": "Indigo Blue"},
    },
]


# ── Insert products ────────────────────────────────────────────────────────────

print(f"\n{SEP}\n  Seeding {len(PRODUCTS)} products\n{SEP}\n")

import json

inserted = 0
skipped  = 0
failed   = 0

for p in PRODUCTS:
    title = p["title"]
    try:
        # Check if already exists
        cur.execute("SELECT id FROM products WHERE title = %s", (title,))
        if cur.fetchone():
            info(f"SKIP  {title}  (already exists)")
            skipped += 1
            continue

        specs = p.get("specifications", {})

        cur.execute("""
            INSERT INTO products (
                title, description, category, price,
                stock_quantity, low_stock_threshold,
                image_url, specifications,
                is_active, is_featured, is_new, is_bestseller
            ) VALUES (
                %s, %s, %s, %s,
                %s, %s,
                %s, %s,
                TRUE, %s, %s, %s
            )
        """, (
            title,
            p.get("description", ""),
            p.get("category", ""),
            p.get("price", 1.00),
            p.get("stock_quantity", 10),
            p.get("low_stock_threshold", 5),
            p.get("image_url"),
            json.dumps(specs),
            p.get("is_featured", False),
            p.get("is_new", False),
            p.get("is_bestseller", False),
        ))
        conn.commit()
        ok(f"{title}")
        inserted += 1

    except Exception as e:
        conn.rollback()
        fail(f"{title}", str(e)[:100])
        failed += 1

cur.close()
conn.close()


# ── Summary ────────────────────────────────────────────────────────────────────

print(f"""
{SEP}
  Done.

  ✓  Inserted : {inserted}
  →  Skipped  : {skipped} (already existed)
  ✗  Failed   : {failed}

  All prices are set to KES 1 — update them in the admin panel
  under Products → click a product → edit price.
{SEP}
""")
