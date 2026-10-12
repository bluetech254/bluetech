#!/usr/bin/env python3
"""
seed_services.py — Seed repair_services, device_brands, device_models into prod DB.

Run on cPanel after setup_prod.py:
    python3 seed_services.py

Safe to re-run — uses ON CONFLICT DO NOTHING everywhere.
"""

import os
import sys
import subprocess

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_FILE = os.path.join(BASE_DIR, ".env")


def load_env(path):
    if not os.path.exists(path):
        return
    with open(path) as f:
        for raw in f:
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value


load_env(ENV_FILE)

# Install psycopg2 if needed
try:
    import psycopg2
except ImportError:
    subprocess.run([sys.executable, "-m", "pip", "install", "psycopg2-binary", "-q"], check=True)
    import psycopg2

# Connect
conn = None
for host in ["/var/run/postgresql", "localhost", "127.0.0.1"]:
    try:
        conn = psycopg2.connect(
            host=host,
            port=int(os.getenv("DB_PORT", "5432")),
            dbname=os.getenv("DB_NAME", "fixitblu_prod_db"),
            user=os.getenv("DB_USER", "fixitblu_prod_user"),
            password=os.getenv("DB_PASSWORD", ""),
            connect_timeout=10,
        )
        print(f"Connected via {host}")
        break
    except Exception:
        continue

if not conn:
    print("ERROR: Could not connect to PostgreSQL")
    sys.exit(1)

cur = conn.cursor()

# ── REPAIR SERVICES ──────────────────────────────────────────────────────────

print("\nSeeding repair_services...")

SERVICES = [
    # (service_name, service_category, base_price)

    # LAPTOP - Screen / Display
    ("Laptop Screen Replacement",        "Laptop Screen / Display",       4500.00),
    ("Blue Screen Repair",               "Laptop Screen / Display",       2000.00),
    ("Laptop Touchscreen Replacement",   "Laptop Screen / Display",       6000.00),
    ("Screen Flickering Repair",         "Laptop Screen / Display",       2500.00),
    ("Black Screen / No Display Repair", "Laptop Screen / Display",       2000.00),

    # LAPTOP - Keyboard / Touchpad
    ("Laptop Keyboard Replacement",      "Laptop Keyboard / Touchpad",    3500.00),
    ("Backlit Keyboard Repair",          "Laptop Keyboard / Touchpad",    2500.00),
    ("Laptop Touchpad Replacement",      "Laptop Keyboard / Touchpad",    2500.00),
    ("Touchpad Cable / Flex Repair",     "Laptop Keyboard / Touchpad",    1500.00),

    # LAPTOP - Battery / Charging
    ("Laptop Battery Replacement",       "Laptop Battery / Charging",     3500.00),
    ("Laptop Battery Not Charging",      "Laptop Battery / Charging",     1500.00),
    ("Battery Draining Fast",            "Laptop Battery / Charging",     1500.00),
    ("Power Adapter / Charger Diagnosis","Laptop Battery / Charging",     1000.00),
    ("Laptop Charging Failure",          "Laptop Battery / Charging",     2000.00),
    ("DC Power Jack Repair",             "Laptop Battery / Charging",     2500.00),
    ("Charging Port Replacement",        "Laptop Battery / Charging",     2500.00),
    ("Charging Circuit Repair",          "Laptop Battery / Charging",     3000.00),

    # LAPTOP - Motherboard
    ("Laptop Motherboard Repair",        "Laptop Motherboard",            8000.00),
    ("Laptop Motherboard Replacement",   "Laptop Motherboard",           15000.00),
    ("Chip-Level Repair",                "Laptop Motherboard",            6000.00),
    ("Laptop Not Powering On",           "Laptop Motherboard",            3000.00),
    ("No Power / Dead Laptop Repair",    "Laptop Motherboard",            4000.00),
    ("No Display Motherboard Repair",    "Laptop Motherboard",            4000.00),
    ("GPU Circuit Repair",               "Laptop Motherboard",            7000.00),
    ("BIOS Programming",                 "Laptop Motherboard",            2500.00),

    # LAPTOP - Water Damage
    ("Liquid Damage Repair",             "Laptop Water Damage",           5000.00),
    ("Corrosion Removal",                "Laptop Water Damage",           3000.00),
    ("Liquid Damage Motherboard Repair", "Laptop Water Damage",           8000.00),
    ("Laptop Internal Cleaning",         "Laptop Water Damage",           1500.00),

    # LAPTOP - Casing
    ("Casing Cover Replacement",         "Laptop Casing",                 4000.00),
    ("Laptop Hinge Repair",              "Laptop Casing",                 3000.00),
    ("Casing Repair",                    "Laptop Casing",                 2500.00),

    # LAPTOP - Overheating
    ("Laptop Fan Replacement",           "Laptop Overheating",            2500.00),
    ("Laptop Fan Repair",                "Laptop Overheating",            2000.00),
    ("Heatsink Replacement",             "Laptop Overheating",            2500.00),
    ("Thermal Paste / Pad Replacement",  "Laptop Overheating",            1500.00),
    ("Auto Shutdown Due to Overheating", "Laptop Overheating",            2000.00),

    # LAPTOP - Storage SSD
    ("SSD Installation",                 "Laptop SSD Storage",            2000.00),
    ("SSD Upgrade",                      "Laptop SSD Storage",            2000.00),
    ("NVMe SSD Upgrade",                 "Laptop SSD Storage",            2500.00),
    ("M.2 SSD Installation",             "Laptop SSD Storage",            2000.00),
    ("SATA SSD Upgrade",                 "Laptop SSD Storage",            2000.00),

    # LAPTOP - Storage HDD
    ("Hard Drive Replacement",           "Laptop HDD Storage",            2500.00),
    ("Hard Drive Upgrade",               "Laptop HDD Storage",            2000.00),
    ("Hard Drive to SSD Upgrade",        "Laptop HDD Storage",            2500.00),

    # LAPTOP - RAM
    ("RAM Upgrade",                      "Laptop RAM",                    2000.00),
    ("RAM Replacement",                  "Laptop RAM",                    2000.00),
    ("RAM Slot Repair",                  "Laptop RAM",                    3000.00),

    # LAPTOP - Data Recovery
    ("Hard Drive Data Recovery",         "Laptop Data Recovery",          5000.00),
    ("SSD Data Recovery",                "Laptop Data Recovery",          6000.00),
    ("External Drive Data Recovery",     "Laptop Data Recovery",          4000.00),
    ("Deleted File Recovery",            "Laptop Data Recovery",          3000.00),
    ("Corrupted Drive Recovery",         "Laptop Data Recovery",          4000.00),

    # LAPTOP - OS
    ("Windows Installation",             "Laptop OS / Windows",           1500.00),
    ("Windows Reinstallation",           "Laptop OS / Windows",           1500.00),
    ("Windows Upgrade",                  "Laptop OS / Windows",           2000.00),
    ("Windows Activation",               "Laptop OS / Windows",           1000.00),
    ("Windows Driver Installation",      "Laptop OS / Windows",           1000.00),

    # LAPTOP - WiFi
    ("Wi-Fi Repair",                     "Laptop WiFi / Bluetooth",       2000.00),
    ("Wi-Fi Card Replacement",           "Laptop WiFi / Bluetooth",       2500.00),
    ("Bluetooth Repair",                 "Laptop WiFi / Bluetooth",       2000.00),
    ("LAN / Ethernet Port Repair",       "Laptop WiFi / Bluetooth",       2500.00),
    ("Network Driver Repair",            "Laptop WiFi / Bluetooth",       1000.00),
    ("Wi-Fi Antenna Repair",             "Laptop WiFi / Bluetooth",       2000.00),

    # LAPTOP - Speaker
    ("Laptop Speaker Replacement",       "Laptop Speaker",                2500.00),
    ("Speaker Repair",                   "Laptop Speaker",                2000.00),
    ("Microphone Repair",                "Laptop Speaker",                2000.00),
    ("Audio Jack Repair",                "Laptop Speaker",                1500.00),
    ("Headphone Jack Repair",            "Laptop Speaker",                1500.00),
    ("Sound Driver Repair",              "Laptop Speaker",                1000.00),

    # LAPTOP - Camera
    ("Webcam Repair",                    "Laptop Camera",                 2000.00),
    ("Camera Replacement",               "Laptop Camera",                 2500.00),

    # LAPTOP - USB / Ports
    ("USB Port Repair",                  "Laptop USB / Ports",            2000.00),
    ("USB Port Replacement",             "Laptop USB / Ports",            2000.00),
    ("USB-C Port Repair",                "Laptop USB / Ports",            2500.00),
    ("USB-C Port Replacement",           "Laptop USB / Ports",            2500.00),
    ("HDMI Port Repair",                 "Laptop USB / Ports",            2500.00),
    ("HDMI Port Replacement",            "Laptop USB / Ports",            2500.00),
    ("DisplayPort Repair",               "Laptop USB / Ports",            2500.00),
    ("SD Card Reader Repair",            "Laptop USB / Ports",            2000.00),

    # PHONE - Screen
    ("Phone Screen Replacement",         "Phone Screen & Display",        3500.00),
    ("Touchscreen Replacement",          "Phone Screen & Display",        4000.00),
    ("Display Flex Cable Repair",        "Phone Screen & Display",        2000.00),
    ("Screen Frame Replacement",         "Phone Screen & Display",        2500.00),

    # PHONE - Battery
    ("Phone Battery Replacement",        "Phone Battery & Power",         2000.00),
    ("Phone Battery Not Charging",       "Phone Battery & Power",         1500.00),
    ("Phone Battery Draining Fast",      "Phone Battery & Power",         1500.00),
    ("Battery Not Detected",             "Phone Battery & Power",         2000.00),
    ("Phone Overheating",                "Phone Battery & Power",         1500.00),
    ("Battery Swelling Inspection",      "Phone Battery & Power",         1000.00),
    ("Phone Restarting Automatically",   "Phone Battery & Power",         1500.00),
    ("Power Button Repair",              "Phone Battery & Power",         1500.00),

    # PHONE - Charging Port
    ("Charging Port Repair",             "Phone Charging & Port",         2000.00),
    ("Charging Port Replacement",        "Phone Charging & Port",         2500.00),
    ("USB-C Port Replacement",           "Phone Charging & Port",         2500.00),
    ("Phone Not Charging",               "Phone Charging & Port",         2000.00),
    ("Slow Charging Repair",             "Phone Charging & Port",         1500.00),
    ("Fast Charging Not Working",        "Phone Charging & Port",         1500.00),
    ("Wireless Charging Repair",         "Phone Charging & Port",         2500.00),

    # PHONE - Motherboard
    ("Phone Motherboard Repair",         "Phone Motherboard",             6000.00),
    ("Phone Motherboard Replacement",    "Phone Motherboard",            12000.00),
    ("Phone Chip-Level Repair",          "Phone Motherboard",             5000.00),
    ("Bootloop Repair",                  "Phone Motherboard",             3000.00),

    # PHONE - Water Damage
    ("Phone Water Damage Repair",        "Phone Water Damage",            3500.00),
    ("Phone Liquid Damage Repair",       "Phone Water Damage",            3500.00),
    ("Phone Corrosion Removal",          "Phone Water Damage",            2500.00),
    ("Phone Board Cleaning",             "Phone Water Damage",            2000.00),

    # PHONE - Camera
    ("Rear Camera Replacement",          "Phone Camera",                  2500.00),
    ("Front Camera Replacement",         "Phone Camera",                  2000.00),
    ("Main Camera Repair",               "Phone Camera",                  2500.00),
    ("Ultrawide Camera Repair",          "Phone Camera",                  2500.00),
    ("Telephoto Camera Repair",          "Phone Camera",                  2500.00),
    ("Camera Lens Glass Replacement",    "Phone Camera",                  1500.00),
    ("Camera Not Working",               "Phone Camera",                  2000.00),
    ("Blurry Camera Repair",             "Phone Camera",                  2000.00),
    ("Camera Shaking Repair",            "Phone Camera",                  2500.00),

    # PHONE - Speaker
    ("Earpiece Speaker Replacement",     "Phone Speaker & Audio",         1500.00),
    ("Loudspeaker Replacement",          "Phone Speaker & Audio",         2000.00),
    ("Phone Speaker Repair",             "Phone Speaker & Audio",         1500.00),
    ("Speaker Cleaning",                 "Phone Speaker & Audio",         1000.00),
    ("No Sound Repair",                  "Phone Speaker & Audio",         1500.00),
    ("Low Sound Repair",                 "Phone Speaker & Audio",         1500.00),
    ("Microphone Replacement",           "Phone Speaker & Audio",         1500.00),

    # PHONE - Buttons
    ("Volume Button Repair",             "Phone Buttons & Controls",      1500.00),
    ("Home Button Repair",               "Phone Buttons & Controls",      1500.00),
    ("Fingerprint Button Repair",        "Phone Buttons & Controls",      2000.00),
    ("Button Flex Cable Replacement",    "Phone Buttons & Controls",      1500.00),
    ("Button Housing Repair",            "Phone Buttons & Controls",      1500.00),

    # PHONE - Body
    ("Back Glass Replacement",           "Phone Back Glass & Housing",    2500.00),
    ("Back Cover Replacement",           "Phone Back Glass & Housing",    2000.00),
    ("Phone Frame Replacement",          "Phone Back Glass & Housing",    3500.00),

    # PHONE - SIM Tray
    ("SIM Tray Replacement",             "Phone SIM Tray",                1000.00),
    ("SIM Tray Repair",                  "Phone SIM Tray",                 800.00),

    # PHONE - Network
    ("Network Signal Repair",            "Phone Network & Connectivity",  2000.00),
    ("No Network Repair",                "Phone Network & Connectivity",  2000.00),
    ("Weak Signal Diagnosis",            "Phone Network & Connectivity",  1500.00),
    ("SIM Card Reader Repair",           "Phone Network & Connectivity",  2000.00),
    ("SIM Card Slot Replacement",        "Phone Network & Connectivity",  2500.00),
    ("Phone Wi-Fi Repair",               "Phone Network & Connectivity",  2000.00),
    ("Phone Bluetooth Repair",           "Phone Network & Connectivity",  2000.00),
    ("Bluetooth IC Repair",              "Phone Network & Connectivity",  3000.00),

    # PHONE - Security
    ("Screen Lock Troubleshooting",      "Phone Security & Account",      1000.00),
    ("PIN / Password Recovery",          "Phone Security & Account",      1000.00),
    ("Pattern Lock Troubleshooting",     "Phone Security & Account",      1000.00),
    ("Face Unlock Troubleshooting",      "Phone Security & Account",      1000.00),
    ("Fingerprint Unlock Troubleshooting","Phone Security & Account",     1000.00),
    ("Face ID Diagnosis",                "Phone Security & Account",      1500.00),
    ("Apple ID Support",                 "Phone Security & Account",      1500.00),

    # PHONE - Setup & Accessories
    ("Screen Protector Installation",    "Phone Setup & Accessories",      500.00),
    ("Hydrogel Film Installation",       "Phone Setup & Accessories",      700.00),
    ("Camera Lens Protector Installation","Phone Setup & Accessories",     500.00),
    ("Phone Case Fitting",               "Phone Setup & Accessories",      300.00),
    ("Battery Health Check",             "Phone Setup & Accessories",      500.00),
    ("New Phone Setup",                  "Phone Setup & Accessories",     1000.00),
    ("Phone Data Transfer",              "Phone Setup & Accessories",     1000.00),
    ("Email Account Setup",              "Phone Setup & Accessories",      500.00),
    ("WhatsApp Setup",                   "Phone Setup & Accessories",      300.00),
    ("Google Account Setup",             "Phone Setup & Accessories",      500.00),
    ("Apple Account Setup",              "Phone Setup & Accessories",      500.00),
]

inserted = 0
skipped = 0
for name, category, price in SERVICES:
    try:
        cur.execute("""
            INSERT INTO repair_services (service_name, service_category, base_price, is_active)
            VALUES (%s, %s, %s, TRUE)
            ON CONFLICT DO NOTHING
        """, (name, category, price))
        if cur.rowcount > 0:
            inserted += 1
        else:
            skipped += 1
    except Exception as e:
        print(f"  ERROR inserting service '{name}': {e}")
        conn.rollback()

conn.commit()
print(f"  repair_services: {inserted} inserted, {skipped} already existed")


# ── DEVICE BRANDS + MODELS ───────────────────────────────────────────────────

print("\nSeeding device_brands and device_models...")

# Format: (brand_name, device_type, is_popular, [list of model names])
BRANDS_AND_MODELS = [
    # ── PHONES ───────────────────────────────────────────────────────────────
    ("Apple", "phone", True, [
        "iPhone 6", "iPhone 6s", "iPhone 7", "iPhone 7 Plus",
        "iPhone 8", "iPhone 8 Plus", "iPhone X", "iPhone XR", "iPhone XS", "iPhone XS Max",
        "iPhone SE (2nd Gen)", "iPhone SE (3rd Gen)",
        "iPhone 11", "iPhone 11 Pro", "iPhone 11 Pro Max",
        "iPhone 12", "iPhone 12 mini", "iPhone 12 Pro", "iPhone 12 Pro Max",
        "iPhone 13", "iPhone 13 mini", "iPhone 13 Pro", "iPhone 13 Pro Max",
        "iPhone 14", "iPhone 14 Plus", "iPhone 14 Pro", "iPhone 14 Pro Max",
        "iPhone 15", "iPhone 15 Plus", "iPhone 15 Pro", "iPhone 15 Pro Max",
        "iPhone 16", "iPhone 16 Plus", "iPhone 16 Pro", "iPhone 16 Pro Max",
        "iPhone 16e",
    ]),
    ("Samsung", "phone", True, [
        "Galaxy S21", "Galaxy S21+", "Galaxy S21 Ultra",
        "Galaxy S22", "Galaxy S22+", "Galaxy S22 Ultra",
        "Galaxy S23", "Galaxy S23+", "Galaxy S23 Ultra", "Galaxy S23 FE",
        "Galaxy S24", "Galaxy S24+", "Galaxy S24 Ultra", "Galaxy S24 FE",
        "Galaxy S25", "Galaxy S25+", "Galaxy S25 Ultra",
        "Galaxy A14", "Galaxy A14 5G", "Galaxy A24", "Galaxy A34 5G", "Galaxy A54 5G",
        "Galaxy A15", "Galaxy A15 5G", "Galaxy A25 5G", "Galaxy A35 5G", "Galaxy A55 5G",
        "Galaxy A05", "Galaxy A05s", "Galaxy A06",
        "Galaxy Z Flip4", "Galaxy Z Flip5", "Galaxy Z Flip6",
        "Galaxy Z Fold4", "Galaxy Z Fold5", "Galaxy Z Fold6",
    ]),
    ("Tecno", "phone", True, [
        "CAMON 20", "CAMON 20 Pro", "CAMON 20 Pro 5G",
        "CAMON 30", "CAMON 30 5G", "CAMON 30 Pro 5G",
        "CAMON 40", "CAMON 40 Pro", "CAMON 40 Pro 5G",
        "SPARK 10", "SPARK 10 Pro", "SPARK 20", "SPARK 20 Pro",
        "SPARK 30", "SPARK 30 Pro", "SPARK 40", "SPARK 40 Pro",
        "POVA 4", "POVA 5", "POVA 6", "POVA 6 Pro 5G",
        "PHANTOM X2", "PHANTOM X2 Pro", "PHANTOM V Fold", "PHANTOM V Flip",
    ]),
    ("Infinix", "phone", True, [
        "HOT 30", "HOT 30i", "HOT 40", "HOT 40 Pro", "HOT 50", "HOT 50 Pro",
        "NOTE 30", "NOTE 30 5G", "NOTE 30 Pro", "NOTE 40", "NOTE 40 Pro", "NOTE 40 Pro 5G",
        "ZERO 30", "ZERO 30 5G", "ZERO 40", "ZERO 40 5G",
        "SMART 8", "SMART 8 HD", "SMART 9",
    ]),
    ("Xiaomi", "phone", True, [
        "Redmi Note 12", "Redmi Note 12 Pro", "Redmi Note 12 Pro 5G",
        "Redmi Note 13", "Redmi Note 13 Pro", "Redmi Note 13 Pro 5G",
        "Redmi Note 14", "Redmi Note 14 Pro", "Redmi Note 14 Pro 5G",
        "Redmi 13", "Redmi 13C", "Redmi 14C",
        "Xiaomi 13", "Xiaomi 13 Pro", "Xiaomi 14", "Xiaomi 14 Pro",
        "POCO X5", "POCO X5 Pro", "POCO X6", "POCO X6 Pro", "POCO X7", "POCO X7 Pro",
        "POCO F5", "POCO F5 Pro", "POCO F6", "POCO F6 Pro",
        "POCO M5", "POCO M6", "POCO M6 Pro",
    ]),
    ("OPPO", "phone", False, [
        "OPPO A57", "OPPO A57s", "OPPO A58", "OPPO A78", "OPPO A78 5G",
        "OPPO Reno8", "OPPO Reno8 Pro", "OPPO Reno10", "OPPO Reno10 Pro",
        "OPPO Reno11", "OPPO Reno11 Pro", "OPPO Reno12", "OPPO Reno12 Pro",
        "OPPO Find X5", "OPPO Find X5 Pro", "OPPO Find X6", "OPPO Find X6 Pro",
    ]),
    ("Vivo", "phone", False, [
        "vivo Y36", "vivo Y36 5G", "vivo Y38 5G", "vivo Y100", "vivo Y200",
        "vivo V27", "vivo V27 Pro", "vivo V29", "vivo V29 Pro",
        "vivo V30", "vivo V30 Pro", "vivo V40", "vivo V40 Pro",
        "vivo X80", "vivo X90", "vivo X100",
    ]),
    ("Huawei", "phone", False, [
        "HUAWEI P40", "HUAWEI P40 Pro", "HUAWEI P50", "HUAWEI P50 Pro",
        "HUAWEI P60", "HUAWEI P60 Pro",
        "HUAWEI nova 11", "HUAWEI nova 11 Pro", "HUAWEI nova 12", "HUAWEI nova 12 Pro",
        "HUAWEI Mate 50", "HUAWEI Mate 50 Pro", "HUAWEI Mate 60", "HUAWEI Mate 60 Pro",
    ]),

    # ── LAPTOPS ──────────────────────────────────────────────────────────────
    ("HP", "laptop", True, [
        "HP Pavilion 14", "HP Pavilion 15", "HP Pavilion 16",
        "HP Pavilion x360 14", "HP Pavilion x360 15",
        "HP ProBook 430 G8", "HP ProBook 430 G9", "HP ProBook 440 G8", "HP ProBook 440 G9",
        "HP ProBook 450 G8", "HP ProBook 450 G9", "HP ProBook 450 G10",
        "HP EliteBook 840 G8", "HP EliteBook 840 G9", "HP EliteBook 840 G10",
        "HP EliteBook 850 G8", "HP EliteBook 850 G9",
        "HP ENVY x360 13", "HP ENVY x360 14", "HP ENVY x360 15",
        "HP Spectre x360 14", "HP Spectre x360 15",
        "HP OMEN 15", "HP OMEN 16", "HP OMEN 17",
        "HP Victus 15", "HP Victus 16",
        "HP Laptop 14", "HP Laptop 15", "HP Laptop 17",
        "HP 250 G9", "HP 250 G10", "HP 255 G9", "HP 255 G10",
    ]),
    ("Dell", "laptop", True, [
        "Dell Inspiron 14 3000", "Dell Inspiron 15 3000", "Dell Inspiron 15 5000",
        "Dell Inspiron 16", "Dell Inspiron 16 Plus",
        "Dell Latitude 3420", "Dell Latitude 3430", "Dell Latitude 5420", "Dell Latitude 5430",
        "Dell Latitude 7420", "Dell Latitude 7430",
        "Dell Vostro 3420", "Dell Vostro 3430", "Dell Vostro 5620",
        "Dell XPS 13", "Dell XPS 15", "Dell XPS 17",
        "Dell G15 5520", "Dell G15 5525", "Dell G15 5530",
        "Dell Precision 3570", "Dell Precision 5570",
    ]),
    ("Lenovo", "laptop", True, [
        "Lenovo IdeaPad 3 Gen 7", "Lenovo IdeaPad 3 Gen 8",
        "Lenovo IdeaPad Slim 3 Gen 8", "Lenovo IdeaPad Slim 5 Gen 8",
        "Lenovo IdeaPad 5 Gen 8", "Lenovo IdeaPad 5 Pro Gen 8",
        "Lenovo ThinkPad E14 Gen 5", "Lenovo ThinkPad E15 Gen 5",
        "Lenovo ThinkPad T14 Gen 4", "Lenovo ThinkPad T14s Gen 4",
        "Lenovo ThinkPad X1 Carbon 11th Gen", "Lenovo ThinkPad X1 Carbon 12th Gen",
        "Lenovo Yoga 7 Gen 8", "Lenovo Yoga 9i Gen 8",
        "Lenovo Legion 5 Gen 8", "Lenovo Legion 5i Gen 8",
        "Lenovo Legion 5 Pro Gen 8", "Lenovo Legion Slim 5 Gen 8",
        "Lenovo ThinkBook 14 Gen 6", "Lenovo ThinkBook 16 Gen 6",
        "Lenovo LOQ 15IRX9", "Lenovo LOQ 16IRX9",
        "Lenovo V14 G4", "Lenovo V15 G4",
    ]),
    ("Acer", "laptop", True, [
        "Acer Aspire 3 A315", "Acer Aspire 5 A515", "Acer Aspire 7 A715",
        "Acer Aspire Lite 14", "Acer Aspire Lite 15",
        "Acer Nitro 5 AN515-58", "Acer Nitro 5 AN517-55",
        "Acer Nitro V 15", "Acer Nitro V 16",
        "Acer Nitro 16", "Acer Nitro 17",
        "Acer Predator Helios 300", "Acer Predator Helios 16", "Acer Predator Triton 300 SE",
        "Acer Spin 3", "Acer Spin 5",
        "Acer Swift 3", "Acer Swift 5",
    ]),
    ("ASUS", "laptop", True, [
        "ASUS VivoBook 14 X1402", "ASUS VivoBook 15 X1502", "ASUS VivoBook 16 X1602",
        "ASUS VivoBook S14", "ASUS VivoBook S15",
        "ASUS VivoBook Go 14", "ASUS VivoBook Go 15",
        "ASUS VivoBook Pro 14", "ASUS VivoBook Pro 15",
        "ASUS ZenBook 14 UX3402", "ASUS ZenBook 14 UX3405",
        "ASUS ZenBook 13 UX325", "ASUS ZenBook Flip 14",
        "ASUS ROG Strix G15", "ASUS ROG Strix G16",
        "ASUS TUF Gaming A15", "ASUS TUF Gaming F15",
    ]),
    ("Apple", "laptop", True, [
        "MacBook Air M1 13-inch 2020",
        "MacBook Air M2 13-inch 2022",
        "MacBook Air M2 15-inch 2023",
        "MacBook Air M3 13-inch 2024",
        "MacBook Air M3 15-inch 2024",
        "MacBook Pro 13-inch M1 2020",
        "MacBook Pro 14-inch M1 Pro 2021",
        "MacBook Pro 16-inch M1 Pro 2021",
        "MacBook Pro 13-inch M2 2022",
        "MacBook Pro 14-inch M2 Pro 2023",
        "MacBook Pro 16-inch M2 Pro 2023",
        "MacBook Pro 14-inch M3 2023",
        "MacBook Pro 16-inch M3 Pro 2023",
        "MacBook Pro 14-inch M4 2024",
        "MacBook Pro 16-inch M4 Pro 2024",
    ]),
    ("Toshiba", "laptop", False, [
        "Toshiba Satellite C650", "Toshiba Satellite C660", "Toshiba Satellite L650",
        "Toshiba Satellite Pro A50", "Toshiba Satellite Pro C50",
        "Toshiba Tecra A50", "Toshiba Tecra Z40", "Toshiba Tecra X40",
    ]),
]

brand_inserted = 0
model_inserted = 0

for brand_name, device_type, is_popular, models in BRANDS_AND_MODELS:
    # Insert brand (get or create)
    cur.execute("""
        INSERT INTO device_brands (name, device_type, is_popular, is_active)
        VALUES (%s, %s, %s, TRUE)
        ON CONFLICT DO NOTHING
        RETURNING id
    """, (brand_name, device_type, is_popular))

    row = cur.fetchone()
    if row:
        brand_id = row[0]
        brand_inserted += 1
    else:
        # Already exists — fetch id
        cur.execute(
            "SELECT id FROM device_brands WHERE name = %s AND device_type = %s",
            (brand_name, device_type)
        )
        row = cur.fetchone()
        if not row:
            continue
        brand_id = row[0]

    for model_name in models:
        cur.execute("""
            INSERT INTO device_models (brand_id, name, device_type, is_active)
            VALUES (%s, %s, %s, TRUE)
            ON CONFLICT DO NOTHING
        """, (brand_id, model_name, device_type))
        if cur.rowcount > 0:
            model_inserted += 1

conn.commit()
print(f"  device_brands:  {brand_inserted} inserted")
print(f"  device_models:  {model_inserted} inserted")

conn.close()
print(f"\nDone. Seed complete.")
