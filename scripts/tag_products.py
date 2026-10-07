import httpx, json, os, sys

# All credentials must be set in environment — never hardcoded.
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SERVICE_KEY  = os.environ.get("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SERVICE_KEY:
    print("❌ Missing required env vars: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set.")
    print("   Export them or copy backend/.env.example to backend/.env and fill in values.")
    sys.exit(1)

headers = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

# id -> tags to apply
tags = {
    # is_featured (8 premium products)
    "a951d2c9-53c8-4b73-bab8-5a43ee0fa98f": {"is_featured": True},  # Lenovo Legion Pro
    "426859e3-4239-410b-b19a-3d86542ee2c4": {"is_featured": True},  # MacBook Pro M3
    "51118258-184b-4132-b587-85dc5c814e6e": {"is_featured": True},  # RTX 4070 Ti
    "aef56fdc-3ba9-456f-a14f-720928d5a8b7": {"is_featured": True},  # Acer Predator OLED
    "3effa812-8065-4739-8472-4afc9d26f6d9": {"is_featured": True},  # Sony A7 IV
    "fae48ac5-6022-40e2-bc93-8652816085ad": {"is_featured": True},  # Sony WH-1000XM5
    "7eea82aa-8ee5-4af0-a2ea-2dc3eba2bd99": {"is_featured": True},  # Ryzen 9 7950X3D
    "8275f85a-c2e0-407d-be5c-bd827f14ef26": {"is_featured": True},  # Dell XPS 15 OLED

    # is_discounted + discount_percent (8 products)
    "30483d24-da16-4783-974f-d0cdea2b85c0": {"is_discounted": True, "discount_percent": 15},  # Samsung SSD
    "de17b915-dc3e-4f28-b14a-52f512de00ce": {"is_discounted": True, "discount_percent": 20},  # Sonos Five
    "255122a0-b46f-4833-a208-ba167c97ab31": {"is_discounted": True, "discount_percent": 25},  # ATH-M50x
    "99cfa1b9-0ad4-42b5-ab22-7ef0509fd68c": {"is_discounted": True, "discount_percent": 18},  # Cooler Master AIO
    "cccc90c0-0a5b-4583-8c10-0b21e79e4129": {"is_discounted": True, "discount_percent": 30},  # Marshall Speaker
    "7a342ff8-bcb4-4437-a58b-fc309ce8ef56": {"is_discounted": True, "discount_percent": 12},  # ASUS Router
    "b8bf4c4a-f998-411d-af3d-bea83a8ce63c": {"is_discounted": True, "discount_percent": 22},  # Samsung 980 Pro
    "25d78e03-ab21-4a17-9043-6eea0619af8c": {"is_discounted": True, "discount_percent": 10},  # WD Black SN770

    # is_flash_sale (5 products — big discounts)
    "8b9e7bb3-c097-4502-bbe6-27c0ddfd6f24": {"is_flash_sale": True, "is_discounted": True, "discount_percent": 35},  # RTX 4070 Super
    "de0edc71-d541-414c-983a-da90193d6394": {"is_flash_sale": True, "is_discounted": True, "discount_percent": 40},  # Kingston DDR5
    "c7020e4f-b256-47ea-aabf-81973d5fd066": {"is_flash_sale": True, "is_discounted": True, "discount_percent": 28},  # Seasonic PSU
    "7addda18-17ea-4037-81ec-842275cd363c": {"is_flash_sale": True, "is_discounted": True, "discount_percent": 32},  # Fractal Case
    "ca02edb1-ca7c-459b-a73f-c88aec433003": {"is_flash_sale": True, "is_discounted": True, "discount_percent": 38},  # Wacom Tablet

    # is_new_arrival (6 newest/latest gen)
    "6ddb3f21-847b-4983-a21f-b7dc3c7638b5": {"is_new_arrival": True},  # i9-14900K
    "2e5e426c-9e7e-4ad6-82db-83942e158983": {"is_new_arrival": True},  # ASUS ROG Maximus Z790
    "9768da9d-b85d-4106-843d-c1b677d83943": {"is_new_arrival": True},  # Gigabyte Z790
    "97b6ab4c-f4ad-4498-8cf0-82a10e089ee3": {"is_new_arrival": True},  # Samsung Tab S9 Ultra
    "4c0367e3-c393-40a3-885b-027861f06d7c": {"is_new_arrival": True},  # Google Pixel 8 Pro
    "c0b7be32-fafe-4751-a509-c817aad5c1cb": {"is_new_arrival": True},  # Elgato Stream Deck

    # is_best_seller (6 popular items)
    "92478962-40ee-46ab-bba4-682cd0eb87ae": {"is_best_seller": True},  # Ryzen 7 7800X3D
    "fae48ac5-6022-40e2-bc93-8652816085ad": {"is_best_seller": True},  # Sony WH-1000XM5
    "426859e3-4239-410b-b19a-3d86542ee2c4": {"is_best_seller": True},  # MacBook Pro M3
    "30483d24-da16-4783-974f-d0cdea2b85c0": {"is_best_seller": True},  # Samsung SSD
    "44106005-1350-4b86-87c9-49c7038f68bd": {"is_best_seller": True},  # Keychron Q1 Pro
    "3a10bea9-540e-4a21-8ddb-fd2851c266a7": {"is_best_seller": True},  # RTX 4070

    # is_trending (5)
    "7170a0f6-d039-4d48-828e-bd30798dc237": {"is_trending": True},  # Alienware QD-OLED
    "bce60f0d-1b67-4daf-b6e5-65875dabe123": {"is_trending": True},  # ASUS ROG Zephyrus G14
    "e51eec5c-cd8c-4e70-8cb8-131376ec4d1b": {"is_trending": True},  # Sony ZV-E10
    "3096850f-56f9-4b0f-8b30-3997b06ea6e0": {"is_trending": True},  # G.Skill DDR5
    "ddd9ad2f-90db-44cf-92c9-46881c616ea7": {"is_trending": True},  # MSI QD-OLED 360Hz

    # is_clearance (4 — older/overstocked)
    "a4945506-cf10-482e-8e92-354ea3876ab6": {"is_clearance": True, "is_discounted": True, "discount_percent": 45},  # Office Chair
    "7b174b1c-beb8-4416-8243-8e25b29b6ac9": {"is_clearance": True, "is_discounted": True, "discount_percent": 35},  # Corsair Case
    "b0b6c97e-747a-4f2e-8508-aa2cf6878953": {"is_clearance": True, "is_discounted": True, "discount_percent": 30},  # LG 4K Monitor
    "6e667678-9683-4f50-8815-dfaa6030f04a": {"is_clearance": True, "is_discounted": True, "discount_percent": 20},  # i7-14700K

    # is_refurbished (3)
    "af52ac03-d852-49a3-9a23-296d7787304d": {"is_refurbished": True},  # Garmin Fenix 7X
    "6dff6c22-35bf-49a4-b174-c7fc408ac99d": {"is_refurbished": True},  # ViewSonic 4K
    "2c4df687-c0c9-4da5-8c71-9c1fc1a37201": {"is_refurbished": True},  # ASUS ROG Swift 360Hz

    # is_pre_order (3)
    "629748c6-6285-4199-b735-bfae9f6edbe6": {"is_pre_order": True},  # WD Black SN850X
    "30dd83ae-e518-4f0f-8aee-06bc6c74c3b5": {"is_pre_order": True},  # RX 7900 XTX
    "b5446050-2753-46d9-9db9-658416508097": {"is_pre_order": True},  # i7-14700K (alt)

    # is_back_in_stock (3)
    "1341d74a-96bc-4d34-9d40-1e80448e4dd6": {"is_back_in_stock": True},  # Arctic AIO
    "7779b66a-e636-46ce-9ae2-50d27171ffa2": {"is_back_in_stock": True},  # Corsair DDR5
    "0f72d117-c751-42dc-a9ea-e596ec3bc682": {"is_back_in_stock": True},  # LG C3 OLED TV

    # is_editors_choice (4)
    "51118258-184b-4132-b587-85dc5c814e6e": {"is_editors_choice": True},  # RTX 4070 Ti
    "8275f85a-c2e0-407d-be5c-bd827f14ef26": {"is_editors_choice": True},  # Dell XPS 15
    "3effa812-8065-4739-8472-4afc9d26f6d9": {"is_editors_choice": True},  # Sony A7 IV
    "aef56fdc-3ba9-456f-a14f-720928d5a8b7": {"is_editors_choice": True},  # Acer Predator OLED

    # is_weekly_deal (4)
    "de17b915-dc3e-4f28-b14a-52f512de00ce": {"is_weekly_deal": True},  # Sonos Five
    "255122a0-b46f-4833-a208-ba167c97ab31": {"is_weekly_deal": True},  # ATH-M50x
    "cccc90c0-0a5b-4583-8c10-0b21e79e4129": {"is_weekly_deal": True},  # Marshall Speaker
    "ca02edb1-ca7c-459b-a73f-c88aec433003": {"is_weekly_deal": True},  # Wacom Tablet

    # is_coming_soon (3)
    "9768da9d-b85d-4106-843d-c1b677d83943": {"is_coming_soon": True},  # Gigabyte Z790
    "2e5e426c-9e7e-4ad6-82db-83942e158983": {"is_coming_soon": True},  # ASUS ROG Maximus
    "629748c6-6285-4199-b735-bfae9f6edbe6": {"is_coming_soon": True},  # WD SN850X
}

# Merge tags per product ID
merged = {}
for pid, tag in tags.items():
    if pid not in merged:
        merged[pid] = {}
    merged[pid].update(tag)

# Apply via Supabase REST PATCH
success, failed = 0, 0
for pid, payload in merged.items():
    r = httpx.patch(
        f"{SUPABASE_URL}/rest/v1/products?id=eq.{pid}",
        headers=headers,
        json=payload
    )
    if r.status_code in (200, 204):
        success += 1
    else:
        failed += 1
        print(f"FAILED {pid}: {r.status_code} {r.text[:80]}")

print(f"\nDone: {success} updated, {failed} failed")
