#!/usr/bin/env python3
"""
seed_products.py — Seed 20 products into the BlueTech database.

Run in the cPanel "Setup Python App" terminal:

    python3 seed_products.py

What this seeds:
  - 20 real tech products with Unsplash images
  - Correct category stored both in `category` column AND `specifications.category`
  - All 13 merchandising flags set appropriately per product
  - Products spread across carousels: featured, new arrivals, best sellers,
    trending, flash sale, hot deals, editors choice, weekly deals, etc.
  - All prices KES 1 — update via admin panel later

Safe to re-run — skips products that already exist by title.
"""

import os
import sys
import json

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

# ── Load .env ──────────────────────────────────────────────────────────────────

print(f"\n{SEP}\n  BlueTech Product Seeder\n{SEP}")

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(BASE_DIR, ".env"))
    ok(".env loaded")
except ImportError:
    info("python-dotenv not installed — reading env vars directly")

# ── Connect ────────────────────────────────────────────────────────────────────

try:
    import psycopg2
    import psycopg2.extras
except ImportError:
    import subprocess
    subprocess.run([sys.executable, "-m", "pip", "install", "psycopg2-binary", "-q"], check=True)
    import psycopg2
    import psycopg2.extras

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
        info(f"trying {host!r} ... {str(e)[:60]}")

if not conn:
    fail("Could not connect to database")
    sys.exit(1)

cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)


# ── Check which columns exist in products table ────────────────────────────────
# (gracefully handles schema differences between environments)

cur.execute("""
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'products' AND table_schema = 'public'
""")
existing_cols = {row[0] for row in cur.fetchall()}
info(f"Products table has {len(existing_cols)} columns")


# ── Product definitions ────────────────────────────────────────────────────────
#
# Merchandising flags reference:
#   is_featured        → "Featured Products" carousel ⭐
#   is_flash_sale      → "Flash Sale" carousel ⚡
#   is_discounted      → "Hot Deals" carousel 🔥
#   is_new_arrival     → "New Arrivals" carousel 🆕
#   is_best_seller     → "Best Sellers" carousel 🏆
#   is_trending        → "Trending Now" carousel 📈
#   is_editors_choice  → "Editor's Choice" carousel 🎖️
#   is_weekly_deal     → "Weekly Deals" carousel 🗓️
#   is_back_in_stock   → "Back in Stock" carousel ✅
#   is_clearance       → "Clearance" carousel 🏷️
#   is_refurbished     → "Refurbished" carousel ♻️
#   is_pre_order       → "Pre-Order" carousel 🔔
#   is_coming_soon     → "Coming Soon" carousel 🚀
#
# NOTE: category is stored in BOTH `category` column AND `specifications.category`
# so the backend /categories endpoint and client-side filter both work correctly.

PRODUCTS = [
    # ── Smartphones ─────────────────────────────────────────────────────────────
    {
        "title":       "Samsung Galaxy S24 Ultra",
        "description": "Latest Samsung flagship with built-in S Pen, 200MP camera, 5000mAh battery, Snapdragon 8 Gen 3 processor, and titanium frame. The ultimate Android powerhouse.",
        "category":    "Smartphones",
        "price":       1.00,
        "stock_quantity": 15,
        "image_url":   "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800&q=80",
        "is_featured":       True,
        "is_new_arrival":    True,
        "is_editors_choice": True,
        "specifications": {"brand": "Samsung", "storage": "256GB", "ram": "12GB", "color": "Titanium Black", "category": "Smartphones"},
    },
    {
        "title":       "iPhone 15 Pro Max",
        "description": "Apple's most powerful iPhone with A17 Pro chip, titanium design, 48MP camera system with 5x optical zoom, and USB-C connectivity.",
        "category":    "Smartphones",
        "price":       1.00,
        "stock_quantity": 12,
        "image_url":   "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&q=80",
        "is_featured":    True,
        "is_best_seller": True,
        "is_trending":    True,
        "specifications": {"brand": "Apple", "storage": "256GB", "ram": "8GB", "color": "Natural Titanium", "category": "Smartphones"},
    },
    {
        "title":       "Tecno Camon 30 Premier",
        "description": "Premium Tecno smartphone with 50MP RGBW front camera, 6.77-inch AMOLED display, 5000mAh battery, and 45W fast charging. Exceptional value.",
        "category":    "Smartphones",
        "price":       1.00,
        "stock_quantity": 20,
        "image_url":   "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80",
        "is_new_arrival": True,
        "is_weekly_deal": True,
        "specifications": {"brand": "Tecno", "storage": "256GB", "ram": "8GB", "color": "Startrail Black", "category": "Smartphones"},
    },
    {
        "title":       "Samsung Galaxy A55 5G",
        "description": "Mid-range Samsung with 50MP OIS camera, IP67 water resistance, 5000mAh battery, and 5G. The best value Samsung for everyday use.",
        "category":    "Smartphones",
        "price":       1.00,
        "stock_quantity": 18,
        "image_url":   "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&q=80",
        "is_best_seller": True,
        "is_discounted":  True,
        "specifications": {"brand": "Samsung", "storage": "128GB", "ram": "8GB", "color": "Awesome Navy", "category": "Smartphones"},
    },

    # ── Laptops ──────────────────────────────────────────────────────────────────
    {
        "title":       "MacBook Air M3",
        "description": "Ultra-thin Apple laptop with M3 chip, 18-hour battery life, 13.6-inch Liquid Retina display, and completely fanless silent design.",
        "category":    "Laptops",
        "price":       1.00,
        "stock_quantity": 8,
        "image_url":   "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80",
        "is_featured":       True,
        "is_best_seller":    True,
        "is_editors_choice": True,
        "specifications": {"brand": "Apple", "storage": "256GB SSD", "ram": "8GB", "processor": "Apple M3", "category": "Laptops"},
    },
    {
        "title":       "Dell XPS 15",
        "description": "Premium Windows laptop with Intel Core i7-13700H, 15.6-inch OLED display, NVIDIA RTX 4060, 512GB SSD, and 86Wh battery.",
        "category":    "Laptops",
        "price":       1.00,
        "stock_quantity": 6,
        "image_url":   "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=800&q=80",
        "is_featured":  True,
        "is_trending":  True,
        "specifications": {"brand": "Dell", "storage": "512GB SSD", "ram": "16GB", "processor": "Intel Core i7-13700H", "category": "Laptops"},
    },
    {
        "title":       "HP Pavilion 15",
        "description": "Reliable everyday laptop with Intel Core i5-1335U, 15.6-inch FHD display, 8GB RAM, 512GB SSD. Ideal for students and office use.",
        "category":    "Laptops",
        "price":       1.00,
        "stock_quantity": 14,
        "image_url":   "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&q=80",
        "is_new_arrival": True,
        "is_discounted":  True,
        "specifications": {"brand": "HP", "storage": "512GB SSD", "ram": "8GB", "processor": "Intel Core i5-1335U", "category": "Laptops"},
    },
    {
        "title":       "Lenovo ThinkPad X1 Carbon",
        "description": "Business ultrabook at just 1.12kg with Intel Core i7-1365U, 14-inch IPS display, military-grade MIL-SPEC durability, and 57Wh battery.",
        "category":    "Laptops",
        "price":       1.00,
        "stock_quantity": 5,
        "image_url":   "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&q=80",
        "is_back_in_stock": True,
        "specifications": {"brand": "Lenovo", "storage": "512GB SSD", "ram": "16GB", "processor": "Intel Core i7-1365U", "category": "Laptops"},
    },

    # ── Tablets ──────────────────────────────────────────────────────────────────
    {
        "title":       "iPad Pro 12.9\" M2",
        "description": "Professional tablet with M2 chip, Liquid Retina XDR ProMotion display, Apple Pencil 2 support, Thunderbolt 4 connectivity.",
        "category":    "Tablets",
        "price":       1.00,
        "stock_quantity": 9,
        "image_url":   "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&q=80",
        "is_featured":    True,
        "is_trending":    True,
        "specifications": {"brand": "Apple", "storage": "128GB", "ram": "8GB", "connectivity": "Wi-Fi + Cellular", "category": "Tablets"},
    },
    {
        "title":       "Samsung Galaxy Tab S9",
        "description": "Premium Android tablet with 11-inch Dynamic AMOLED 2X display, S Pen included, IP68 water resistant, DeX desktop mode support.",
        "category":    "Tablets",
        "price":       1.00,
        "stock_quantity": 10,
        "image_url":   "https://images.unsplash.com/photo-1632516643720-e7f5d7d6ecc9?w=800&q=80",
        "is_weekly_deal": True,
        "specifications": {"brand": "Samsung", "storage": "128GB", "ram": "8GB", "color": "Graphite", "category": "Tablets"},
    },

    # ── Chargers & Cables ─────────────────────────────────────────────────────────
    {
        "title":       "Samsung 65W Super Fast Charger",
        "description": "Official Samsung 65W USB-C charger with cable. Charges Galaxy S and A series phones from 0 to 50% in just 20 minutes.",
        "category":    "Chargers & Cables",
        "price":       1.00,
        "stock_quantity": 50,
        "image_url":   "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=800&q=80",
        "is_best_seller": True,
        "is_flash_sale":  True,
        "specifications": {"brand": "Samsung", "wattage": "65W", "connector": "USB-C", "category": "Chargers & Cables"},
    },
    {
        "title":       "Apple 20W USB-C Power Adapter",
        "description": "Genuine Apple 20W USB-C fast charger. Compatible with iPhone 8 and later, all iPad models, AirPods. MFi certified.",
        "category":    "Chargers & Cables",
        "price":       1.00,
        "stock_quantity": 45,
        "image_url":   "https://images.unsplash.com/photo-1601370552761-8a3d2dd33b4e?w=800&q=80",
        "is_best_seller": True,
        "is_discounted":  True,
        "specifications": {"brand": "Apple", "wattage": "20W", "connector": "USB-C", "category": "Chargers & Cables"},
    },

    # ── Power Banks ───────────────────────────────────────────────────────────────
    {
        "title":       "Anker PowerCore 26800mAh Power Bank",
        "description": "High-capacity portable charger with 65W output, dual USB-C + USB-A ports, charges 3 devices simultaneously. 6 full phone charges.",
        "category":    "Power Banks",
        "price":       1.00,
        "stock_quantity": 25,
        "image_url":   "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800&q=80",
        "is_trending":    True,
        "is_weekly_deal": True,
        "specifications": {"brand": "Anker", "capacity": "26800mAh", "output": "65W", "category": "Power Banks"},
    },

    # ── Earphones & Audio ─────────────────────────────────────────────────────────
    {
        "title":       "Samsung Galaxy Buds2 Pro",
        "description": "Premium true wireless earbuds with Active Noise Cancellation, 360° Spatial Audio, IPX7 water resistance, and 8-hour battery.",
        "category":    "Earphones & Audio",
        "price":       1.00,
        "stock_quantity": 20,
        "image_url":   "https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=800&q=80",
        "is_new_arrival":    True,
        "is_editors_choice": True,
        "specifications": {"brand": "Samsung", "type": "True Wireless", "anc": "Yes", "color": "Graphite", "category": "Earphones & Audio"},
    },
    {
        "title":       "Apple AirPods Pro (2nd Gen)",
        "description": "Apple's best earbuds with Adaptive Transparency, Personalized Spatial Audio, H2 chip, and up to 6 hours listening with ANC on.",
        "category":    "Earphones & Audio",
        "price":       1.00,
        "stock_quantity": 15,
        "image_url":   "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=800&q=80",
        "is_best_seller": True,
        "is_trending":    True,
        "specifications": {"brand": "Apple", "type": "True Wireless", "anc": "Yes", "color": "White", "category": "Earphones & Audio"},
    },

    # ── Smart Watches ─────────────────────────────────────────────────────────────
    {
        "title":       "Apple Watch Series 9",
        "description": "Most advanced Apple Watch with S9 chip, Double Tap gesture, Always-On Retina display, crash detection, and ECG app.",
        "category":    "Smart Watches",
        "price":       1.00,
        "stock_quantity": 11,
        "image_url":   "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&q=80",
        "is_featured":       True,
        "is_editors_choice": True,
        "specifications": {"brand": "Apple", "size": "45mm", "color": "Midnight", "connectivity": "GPS + Cellular", "category": "Smart Watches"},
    },
    {
        "title":       "Samsung Galaxy Watch 6 Classic",
        "description": "Premium Samsung smartwatch with iconic rotating bezel, advanced sleep coaching, body composition analysis, and 40-hour battery.",
        "category":    "Smart Watches",
        "price":       1.00,
        "stock_quantity": 9,
        "image_url":   "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800&q=80",
        "is_discounted":  True,
        "is_back_in_stock": True,
        "specifications": {"brand": "Samsung", "size": "47mm", "color": "Black", "os": "Wear OS", "category": "Smart Watches"},
    },

    # ── Cases & Protection ────────────────────────────────────────────────────────
    {
        "title":       "Spigen Tough Armor Phone Case",
        "description": "Military-grade MIL-STD-810G certified protection with Air Cushion Technology and built-in kickstand. For Samsung & iPhone.",
        "category":    "Cases & Protection",
        "price":       1.00,
        "stock_quantity": 60,
        "image_url":   "https://images.unsplash.com/photo-1556656793-08538906a9f8?w=800&q=80",
        "is_best_seller": True,
        "is_clearance":   True,
        "specifications": {"brand": "Spigen", "material": "TPU + Polycarbonate", "protection": "Military Grade", "category": "Cases & Protection"},
    },
    {
        "title":       "Tempered Glass Screen Protector (Pack of 2)",
        "description": "9H hardness tempered glass with anti-fingerprint coating, 99% clarity, and case-friendly edges. Available for all popular models.",
        "category":    "Cases & Protection",
        "price":       1.00,
        "stock_quantity": 100,
        "image_url":   "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&q=80",
        "is_best_seller": True,
        "is_flash_sale":  True,
        "specifications": {"material": "Tempered Glass", "hardness": "9H", "pack": "2 pieces", "category": "Cases & Protection"},
    },

    # ── Storage ───────────────────────────────────────────────────────────────────
    {
        "title":       "Samsung Portable SSD T7 1TB",
        "description": "Ultra-fast portable SSD with 1050MB/s read speed, USB 3.2 Gen 2, hardware AES 256-bit encryption, and shock-resistant metal body.",
        "category":    "Storage",
        "price":       1.00,
        "stock_quantity": 16,
        "image_url":   "https://images.unsplash.com/photo-1531492746076-161ca9bcad58?w=800&q=80",
        "is_new_arrival": True,
        "is_weekly_deal": True,
        "specifications": {"brand": "Samsung", "capacity": "1TB", "interface": "USB 3.2 Gen 2", "color": "Indigo Blue", "category": "Storage"},
    },
]


# ── Insert products ────────────────────────────────────────────────────────────

print(f"\n{SEP}\n  Seeding {len(PRODUCTS)} products\n{SEP}\n")

# All possible merchandising flag columns
ALL_FLAGS = [
    "is_featured", "is_flash_sale", "is_discounted", "is_clearance",
    "is_weekly_deal", "is_new_arrival", "is_best_seller", "is_trending",
    "is_editors_choice", "is_back_in_stock", "is_refurbished",
    "is_pre_order", "is_coming_soon",
]

# Only use flags that actually exist in this DB (handles schema variations)
USABLE_FLAGS = [f for f in ALL_FLAGS if f in existing_cols]
info(f"Using {len(USABLE_FLAGS)} merchandising flags: {', '.join(USABLE_FLAGS)}")
print()

inserted = 0
skipped  = 0
failed   = 0

for p in PRODUCTS:
    title = p["title"]
    try:
        cur.execute("SELECT id FROM products WHERE title = %s", (title,))
        if cur.fetchone():
            info(f"SKIP  {title}")
            skipped += 1
            continue

        # Build specs — ensure category is always in specifications
        specs = dict(p.get("specifications", {}))
        specs["category"] = p.get("category", "")

        # Collect flag values (default False for any flag not set on this product)
        flag_values = {f: p.get(f, False) for f in USABLE_FLAGS}

        # Build dynamic INSERT
        base_cols = ["title", "description", "category", "price",
                     "stock_quantity", "low_stock_threshold",
                     "image_url", "specifications", "is_active"]
        base_vals = [
            title,
            p.get("description", ""),
            p.get("category", ""),
            p.get("price", 1.00),
            p.get("stock_quantity", 10),
            p.get("low_stock_threshold", 5),
            p.get("image_url"),
            json.dumps(specs),
            True,
        ]

        all_cols = base_cols + USABLE_FLAGS
        all_vals = base_vals + [flag_values[f] for f in USABLE_FLAGS]

        placeholders = ", ".join(["%s"] * len(all_cols))
        col_names    = ", ".join(all_cols)

        cur.execute(
            f"INSERT INTO products ({col_names}) VALUES ({placeholders})",
            all_vals,
        )
        conn.commit()

        # Show which carousels this product appears in
        active_flags = [f for f in USABLE_FLAGS if flag_values[f]]
        flags_str = ", ".join(f.replace("is_", "") for f in active_flags) if active_flags else "none"
        ok(f"{title}", f"[{p['category']}] flags: {flags_str}")
        inserted += 1

    except Exception as e:
        conn.rollback()
        fail(f"{title}", str(e)[:120])
        failed += 1

cur.close()
conn.close()


# ── Summary ────────────────────────────────────────────────────────────────────

print(f"""
{SEP}
  Done.

  ✓  Inserted : {inserted}
  →  Skipped  : {skipped}  (already existed — safe to re-run)
  ✗  Failed   : {failed}

  Categories seeded:
    Smartphones, Laptops, Tablets, Chargers & Cables,
    Power Banks, Earphones & Audio, Smart Watches,
    Cases & Protection, Storage

  Carousels populated:
    ⭐  Featured       → S24 Ultra, iPhone 15 Pro Max, MacBook Air M3,
                         Dell XPS 15, iPad Pro M2, Apple Watch S9
    🆕  New Arrivals   → Tecno Camon 30, HP Pavilion 15, Buds2 Pro,
                         Samsung T7 SSD
    🏆  Best Sellers   → iPhone 15 Pro Max, MacBook Air M3, AirPods Pro,
                         Samsung 65W, Apple 20W, Spigen Case, Glass Pack
    📈  Trending       → iPhone 15 Pro Max, Dell XPS 15, iPad Pro M2,
                         AirPods Pro, Anker Power Bank
    ⚡  Flash Sale     → Samsung 65W Charger, Tempered Glass Pack
    🔥  Hot Deals      → Samsung Galaxy A55, HP Pavilion, Apple 20W
    🎖️  Editor's Choice → S24 Ultra, MacBook Air M3, Buds2 Pro, Apple Watch
    🗓️  Weekly Deals   → Tecno Camon 30, Samsung Tab S9, Anker, Samsung T7
    ✅  Back in Stock  → ThinkPad X1 Carbon, Galaxy Watch 6
    🏷️  Clearance      → Spigen Tough Armor Case

  Prices are all KES 1 — update in admin panel:
    Admin → Products → click product → edit price & save.
{SEP}
""")
