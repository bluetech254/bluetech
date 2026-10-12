#!/usr/bin/env python3
"""
check_env.py — BlueTech production .env validator & updater for cPanel.

Run on the cPanel server:
    cd /home2/fixitblu/backend && python3 scripts/check_env.py

Modes:
    --check   Validate only, report issues (default)
    --fix     Validate and update .env with known production DB credentials

What it does:
    1. Reads the .env file at <BASE_DIR>/.env
    2. Checks all required env vars are present and non-empty
    3. Flags any dev/placeholder/sandbox values that don't belong in production
    4. Ensures DATABASE_TYPE=postgresql with correct prod DB credentials
    5. With --fix, updates DB credentials and sets DATABASE_TYPE=postgresql

⚠️  This script contains production DB credentials.
    Do NOT commit this file to git with real credentials.
    It is listed in .gitignore for safety.
"""
import sys
import os
import re
import shutil
from datetime import datetime

# ── Configuration ─────────────────────────────────────────────────────────────

# Default to cPanel path; override with --base-dir for local testing
BASE_DIR = os.environ.get("BLUETECH_BASE_DIR", "/home2/fixitblu/backend")
ENV_PATH = os.path.join(BASE_DIR, ".env")

# ── All production environment values ─────────────────────────────────────────
# These are the known-good production credentials. The --fix mode will
# update the .env file to match these values exactly.
# Production stack: PostgreSQL + Paystack only. No Supabase, no M-Pesa.
PROD_ENV = {
    # Database
    "DATABASE_TYPE": "postgresql",
    "DB_HOST": "217.20.124.84",
    "DB_PORT": "5432",
    "DB_NAME": "fixitblu_prod_db",
    "DB_USER": "fixitblu_prod_user",
    "DB_PASSWORD": "Pa7swrd1990@#12345ooo@#",

    # App config
    "ENVIRONMENT": "production",
    "API_HOST": "0.0.0.0",
    "API_PORT": "8000",
    "DEBUG": "false",
    "ADMIN_PASSWORD": "BlueTech@2026!",

    # CORS — production domains only (no localhost)
    "CORS_ORIGINS": "https://bluetechadmin.vercel.app,https://bluetech-tau.vercel.app,https://bluetech.dallah.co.ke",
    "FRONTEND_URL": "https://bluetech-tau.vercel.app",

    # JWT
    "JWT_SECRET": "c8092f2d1b61930481dc761cd98fe916",

    # Paystack (live keys)
    "PAYSTACK_PUBLIC_KEY": "pk_live_065b16c9af2156cc2140cc1883eac896ad68c443",
    "PAYSTACK_SECRET_KEY": "sk_live_646e60be58d2d886582bc4870f96c13484f6f35f",

    # SMS — BlessedTexts
    "BLESSEDTEXTS_API_KEY": "7d76082305d74d989001e6445a99aaee",
    "BLESSEDTEXTS_SENDER_ID": "Champ_Int",

    # AWS SES (email)
    "AWS_REGION": "us-east-1",
    "AWS_ACCESS_KEY_ID": "AKIAQVLI5J3DKLUIHE32",
    "AWS_SECRET_ACCESS_KEY": "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",

    # Google Maps
    "GOOGLE_MAPS_API_KEY": "AIzaSyBgD_gOVkD6FraeroFAHxQDPZOEXZuOS3E",

    # AWS Cognito
    "COGNITO_APP_CLIENT_ID": "6e8tqf647d17ucqcfr62vm5ie",
    "COGNITO_USER_POOL_ID": "us-east-1_zktWt8Bi4",
}

# Variables whose values should always be overwritten in --fix mode
# (even if the current value isn't empty or a placeholder)
PROD_FORCE_OVERWRITE = {
    "DATABASE_TYPE",    # must be postgresql, not supabase
    "DB_HOST",          # must be prod IP, not localhost
    "DB_PORT",
    "DB_NAME",
    "DB_USER",
    "DB_PASSWORD",
    "DEBUG",            # must be false
    "ENVIRONMENT",      # must be production
    "CORS_ORIGINS",     # must not have localhost
    "FRONTEND_URL",     # must be prod URL
}

# Variables that are sensitive — redact in console output
SENSITIVE_VARS = {
    "DB_PASSWORD", "JWT_SECRET",
    "PAYSTACK_SECRET_KEY", "BLESSEDTEXTS_API_KEY",
    "AWS_SECRET_ACCESS_KEY", "AWS_ACCESS_KEY_ID",
    "ADMIN_PASSWORD", "GOOGLE_MAPS_API_KEY",
}

# ── Required variables (app won't start without these) ────────────────────────

# Settings class requires these with no defaults
REQUIRED_VARS = [
    "JWT_SECRET",
]

# Required for PostgreSQL production mode
REQUIRED_DB_VARS = [
    "DATABASE_TYPE",
    "DB_HOST",
    "DB_PORT",
    "DB_NAME",
    "DB_USER",
    "DB_PASSWORD",
]

# Variables that should be set for full production functionality
SHOULD_HAVE_VARS = [
    "DEBUG",
    "ENVIRONMENT",
    "API_HOST",
    "API_PORT",
    "CORS_ORIGINS",
    "FRONTEND_URL",
    "ADMIN_PASSWORD",
    "PAYSTACK_SECRET_KEY",
    "PAYSTACK_PUBLIC_KEY",
    "BLESSEDTEXTS_API_KEY",
    "BLESSEDTEXTS_SENDER_ID",
    "AWS_REGION",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "GOOGLE_MAPS_API_KEY",
    "COGNITO_APP_CLIENT_ID",
    "COGNITO_USER_POOL_ID",
]

# ── Dev / placeholder patterns to detect ──────────────────────────────────────

# Values that are clearly placeholders, not real credentials
PLACEHOLDER_PATTERNS = [
    r"your_",
    r"replace_with",
    r"change_this",
    r"_here$",
    r"^your ",
    r"placeholder",
    r"example\.com",
    r"your-domain",
    r"your-email",
    r"your_key",
    r"your_secret",
    r"your_passkey",
    r"your_api_key",
    r"your_shortcode",
    r"your_supabase",
]

# Values that indicate dev environment, not production
DEV_VALUE_CHECKS = {
    "DB_HOST": [
        (r"localhost", "localhost is a dev value — prod should be the server IP/domain"),
        (r"127\.0\.0\.1", "127.0.0.1 is a dev value — prod should be the server IP/domain"),
        (r"supabase\.co", "Supabase host detected — prod should use direct PostgreSQL host"),
    ],
    "CORS_ORIGINS": [
        (r"localhost", "localhost in CORS — prod should only allow production domains"),
        (r"127\.0\.0\.1", "127.0.0.1 in CORS — prod should only allow production domains"),
    ],
    "FRONTEND_URL": [
        (r"localhost", "localhost frontend URL — prod should use production domain"),
        (r"http://", "HTTP frontend URL — prod should use HTTPS"),
    ],
    "PAYSTACK_SECRET_KEY": [
        (r"sk_test_", "Paystack secret key is a test key — prod should use sk_live_"),
    ],
    "PAYSTACK_PUBLIC_KEY": [
        (r"pk_test_", "Paystack public key is a test key — prod should use pk_live_"),
    ],
    "DEBUG": [
        (r"(?i)true", "DEBUG is True — must be False in production"),
    ],
    "DATABASE_TYPE": [
        (r"supabase", "DATABASE_TYPE is 'supabase' — prod should be 'postgresql'"),
    ],
}

# ── Result tracking ──────────────────────────────────────────────────────────

results = []
errors_count = 0
warnings_count = 0


def ok(label, detail=""):
    results.append(("OK", label, detail))


def warn(label, detail=""):
    global warnings_count
    warnings_count += 1
    results.append(("WARN", label, detail))


def fail(label, detail=""):
    global errors_count
    errors_count += 1
    results.append(("FAIL", label, detail))


def section(title):
    results.append(("SECTION", title, ""))


# ── .env file parsing ─────────────────────────────────────────────────────────

def parse_env_file(path):
    """
    Parse a .env file into an ordered dict of key→value.
    Preserves comments and line order for writing back.
    Returns (env_dict, raw_lines).
    """
    env = {}
    lines = []

    if not os.path.exists(path):
        return env, lines

    with open(path, "r") as f:
        lines = f.readlines()

    for line in lines:
        stripped = line.strip()
        # Skip comments and empty lines
        if not stripped or stripped.startswith("#"):
            continue
        # Parse KEY=VALUE
        if "=" in stripped:
            key, _, value = stripped.partition("=")
            key = key.strip()
            # Remove inline comments from value (only if preceded by space)
            # Be careful not to strip # from passwords
            value = value.strip()
            env[key] = value

    return env, lines


def update_env_value(lines, key, value):
    """
    Update or add a KEY=VALUE line in the env file lines.
    Returns the updated lines list.
    """
    updated = False
    new_lines = []

    for line in lines:
        stripped = line.strip()
        if stripped and not stripped.startswith("#") and "=" in stripped:
            k, _, _ = stripped.partition("=")
            if k.strip() == key:
                new_lines.append(f"{key}={value}\n")
                updated = True
                continue
        new_lines.append(line)

    if not updated:
        # Append at end
        new_lines.append(f"\n{key}={value}\n")

    return new_lines


def write_env_file(path, lines):
    """Write lines back to the .env file, creating a backup first."""
    backup = path + ".bak." + datetime.now().strftime("%Y%m%d%H%M%S")
    if os.path.exists(path):
        shutil.copy2(path, backup)
        print(f"  ✓  Backup created: {backup}")
    with open(path, "w") as f:
        f.writelines(lines)


# ── Validation checks ─────────────────────────────────────────────────────────

def check_required_vars(env):
    """Check that all required variables are present and non-empty."""
    section("Required Variables (app won't start without these)")
    for var in REQUIRED_VARS:
        val = env.get(var, "")
        if not val:
            fail(var, "NOT SET — app will crash on startup")
        elif _is_placeholder(val):
            fail(var, f"Placeholder value detected: '{_redact(val)}'")
        else:
            ok(var, f"set ({len(val)} chars)")


def check_db_config(env):
    """Check PostgreSQL database configuration for production."""
    section("Database Configuration (PostgreSQL Production)")

    # Check DATABASE_TYPE
    db_type = env.get("DATABASE_TYPE", "")
    if not db_type:
        fail("DATABASE_TYPE", "NOT SET — must be 'postgresql' for production")
    elif db_type.lower() == "postgresql":
        ok("DATABASE_TYPE", "postgresql")
    elif db_type.lower() == "supabase":
        fail("DATABASE_TYPE", "Set to 'supabase' — must be 'postgresql' for production")
    else:
        fail("DATABASE_TYPE", f"Unknown value '{db_type}' — must be 'postgresql'")

    # Check all DB vars
    for var in REQUIRED_DB_VARS:
        if var == "DATABASE_TYPE":
            continue
        val = env.get(var, "")
        if not val:
            fail(var, "NOT SET — required for PostgreSQL connection")
        elif _is_placeholder(val):
            fail(var, f"Placeholder value: '{_redact(val)}'")
        else:
            ok(var, f"set ({len(val)} chars)" + (" [redacted]" if "PASSWORD" in var else ""))

    # Check for dev values in DB config
    for var, patterns in DEV_VALUE_CHECKS.items():
        if var not in REQUIRED_DB_VARS and var != "DATABASE_TYPE":
            continue
        val = env.get(var, "")
        if not val:
            continue
        for pattern, msg in patterns:
            if re.search(pattern, val, re.IGNORECASE):
                fail(var, msg)


def check_dev_values(env):
    """Check for any dev/placeholder values across all env vars."""
    section("Dev / Placeholder Value Detection")

    for var, val in env.items():
        # Check placeholder patterns
        if _is_placeholder(val):
            warn(var, f"Possible placeholder: '{_redact(val)}'")

    # Check specific dev value patterns
    for var, patterns in DEV_VALUE_CHECKS.items():
        val = env.get(var, "")
        if not val:
            continue
        for pattern, msg in patterns:
            if re.search(pattern, val, re.IGNORECASE):
                fail(var, msg)


def check_should_have(env):
    """Check that recommended production variables are present."""
    section("Recommended Production Variables")
    for var in SHOULD_HAVE_VARS:
        val = env.get(var, "")
        if not val:
            warn(var, "NOT SET — recommended for full production functionality")
        elif _is_placeholder(val):
            warn(var, f"Placeholder value: '{_redact(val)}'")
        else:
            ok(var, f"set ({len(val)} chars)" + (" [redacted]" if any(s in var for s in ["KEY", "SECRET", "PASSKEY", "PASSWORD"]) else ""))


def check_jwt(env):
    """Check JWT secret is strong enough for production."""
    section("JWT Security")
    jwt = env.get("JWT_SECRET", "")
    if not jwt:
        fail("JWT_SECRET", "NOT SET — app won't start")
    elif len(jwt) < 32:
        fail("JWT_SECRET", f"Too short ({len(jwt)} chars) — should be 32+ characters")
    elif _is_placeholder(jwt):
        fail("JWT_SECRET", "Placeholder value — generate with: openssl rand -hex 32")
    else:
        ok("JWT_SECRET", f"set ({len(jwt)} chars)")


def check_paystack(env):
    """Check Paystack configuration for production."""
    section("Paystack Configuration")
    secret = env.get("PAYSTACK_SECRET_KEY", "")
    public = env.get("PAYSTACK_PUBLIC_KEY", "")

    if not secret:
        warn("PAYSTACK_SECRET_KEY", "NOT SET — Paystack payments will not work")
    elif secret.startswith("sk_test_"):
        fail("PAYSTACK_SECRET_KEY", "Test key (sk_test_) — must use sk_live_ for production")
    elif secret.startswith("sk_live_"):
        ok("PAYSTACK_SECRET_KEY", "live key set")
    elif _is_placeholder(secret):
        fail("PAYSTACK_SECRET_KEY", "Placeholder — must use sk_live_ key")
    else:
        warn("PAYSTACK_SECRET_KEY", "Set but doesn't match expected sk_live_ prefix")

    if not public:
        warn("PAYSTACK_PUBLIC_KEY", "NOT SET — Paystack frontend checkout will not work")
    elif public.startswith("pk_test_"):
        fail("PAYSTACK_PUBLIC_KEY", "Test key (pk_test_) — must use pk_live_ for production")
    elif public.startswith("pk_live_"):
        ok("PAYSTACK_PUBLIC_KEY", "live key set")
    elif _is_placeholder(public):
        fail("PAYSTACK_PUBLIC_KEY", "Placeholder — must use pk_live_ key")
    else:
        warn("PAYSTACK_PUBLIC_KEY", "Set but doesn't match expected pk_live_ prefix")


def check_cors(env):
    """Check CORS configuration for production."""
    section("CORS & Frontend URL")
    cors = env.get("CORS_ORIGINS", "")
    if not cors:
        warn("CORS_ORIGINS", "NOT SET — API will reject browser requests")
    elif "localhost" in cors or "127.0.0.1" in cors:
        fail("CORS_ORIGINS", "Contains localhost — production should only allow prod domains")
    elif "http://" in cors:
        warn("CORS_ORIGINS", "Contains HTTP URLs — production should use HTTPS only")
    else:
        ok("CORS_ORIGINS", cors)

    frontend = env.get("FRONTEND_URL", "")
    if not frontend:
        warn("FRONTEND_URL", "NOT SET — Paystack callback URL will be empty")
    elif "localhost" in frontend:
        fail("FRONTEND_URL", "localhost — should be production domain")
    elif frontend.startswith("http://"):
        warn("FRONTEND_URL", "HTTP — production should use HTTPS")
    else:
        ok("FRONTEND_URL", frontend)


def check_debug(env):
    """Check DEBUG is off in production."""
    section("Debug Mode")
    debug = env.get("DEBUG", "")
    if not debug:
        warn("DEBUG", "NOT SET — defaults to False (safe)")
    elif debug.lower() in ("true", "1", "yes"):
        fail("DEBUG", "True — MUST be False in production (security risk)")
    elif debug.lower() in ("false", "0", "no"):
        ok("DEBUG", "false")
    else:
        warn("DEBUG", f"Unknown value '{debug}' — should be 'false'")


# ── Helper functions ──────────────────────────────────────────────────────────

def _is_placeholder(value):
    """Check if a value looks like a placeholder, not a real credential."""
    for pattern in PLACEHOLDER_PATTERNS:
        if re.search(pattern, value, re.IGNORECASE):
            return True
    return False


def _redact(value, show=4):
    """Redact sensitive values for display."""
    if len(value) <= show:
        return "*" * len(value)
    return value[:show] + "..." + ("*" * 4)


# ── Fix function ──────────────────────────────────────────────────────────────

def apply_fixes(env, lines, dry_run=False):
    """
    Apply all known production values to the .env file.

    Strategy:
      - PROD_FORCE_OVERWRITE vars: always overwrite (DATABASE_TYPE, DB_*,
        DEBUG, ENVIRONMENT, CORS_ORIGINS, FRONTEND_URL)
      - All other PROD_ENV vars: only update if missing, empty, or a placeholder
    """
    section("Applying Production Fixes")

    changes = []

    for key, value in PROD_ENV.items():
        current = env.get(key, "")
        needs_update = False

        if key in PROD_FORCE_OVERWRITE:
            # Always overwrite these — they must be the exact prod value
            if current != value:
                needs_update = True
        else:
            # Only update if missing, empty, or placeholder
            if not current or _is_placeholder(current):
                needs_update = True

        if needs_update:
            lines = update_env_value(lines, key, value)
            is_sensitive = key in SENSITIVE_VARS
            display_val = _redact(value) if is_sensitive else value
            changes.append(f"{key} → {display_val}")
            tag = " [redacted]" if is_sensitive else ""
            print(f"  →  {key} updated{tag}")

    if changes:
        print(f"\n  {len(changes)} change(s) to apply.")
        if not dry_run:
            write_env_file(ENV_PATH, lines)
            print(f"  ✓  .env updated at {ENV_PATH}")
        else:
            print("  (dry run — no changes written)")
    else:
        print("  No fixes needed — all values already correct.")

    if changes:
        print(f"\n  {len(changes)} change(s) to apply.")
        if not dry_run:
            write_env_file(ENV_PATH, lines)
            print(f"  ✓  .env updated at {ENV_PATH}")
        else:
            print("  (dry run — no changes written)")
    else:
        print("  No DB/CORS/DEBUG fixes needed — values already correct.")

    return changes


# ── Main ──────────────────────────────────────────────────────────────────────

def run_checks(env):
    """Run all validation checks."""
    check_required_vars(env)
    check_db_config(env)
    check_jwt(env)
    check_paystack(env)
    check_cors(env)
    check_debug(env)
    check_should_have(env)
    check_dev_values(env)


def print_report():
    """Print the validation report."""
    print("\n" + "=" * 60)
    print("  BlueTech Production Environment Validation Report")
    print("=" * 60)

    for status, label, detail in results:
        if status == "SECTION":
            print(f"\n{'─' * 50}")
            print(f"  {label}")
            print(f"{'─' * 50}")
        elif status == "OK":
            msg = f"  ✓  {label}"
            if detail:
                msg += f" — {detail}"
            print(msg)
        elif status == "WARN":
            msg = f"  ⚠  {label}"
            if detail:
                msg += f" — {detail}"
            print(msg)
        elif status == "FAIL":
            msg = f"  ✗  {label}"
            if detail:
                msg += f" — {detail}"
            print(msg)

    print("\n" + "=" * 60)
    print(f"  Results: {errors_count} error(s), {warnings_count} warning(s)")
    if errors_count > 0:
        print("  ❌  Environment has ERRORS — fix before deploying!")
    elif warnings_count > 0:
        print("  ⚠️  Environment has warnings — review recommended.")
    else:
        print("  ✅  Environment looks good for production!")
    print("=" * 60 + "\n")


def main():
    # Parse args
    fix_mode = "--fix" in sys.argv
    check_only = "--check" in sys.argv
    dry_run = "--dry-run" in sys.argv
    base_dir_override = None

    for arg in sys.argv[1:]:
        if arg.startswith("--base-dir="):
            base_dir_override = arg.split("=", 1)[1]

    global BASE_DIR, ENV_PATH
    if base_dir_override:
        BASE_DIR = base_dir_override
        ENV_PATH = os.path.join(BASE_DIR, ".env")

    print("=" * 60)
    print("  BlueTech Production .env Validator")
    print(f"  Target: {ENV_PATH}")
    print(f"  Mode:   {'FIX' if fix_mode else 'CHECK'}{' (dry run)' if dry_run else ''}")
    print("=" * 60)

    # Check .env exists
    if not os.path.exists(ENV_PATH):
        print(f"\n❌  .env file not found at {ENV_PATH}")
        print("   Create it first: cp .env.example .env")
        sys.exit(1)

    # Parse .env
    env, lines = parse_env_file(ENV_PATH)

    if not env:
        print("\n❌  .env file is empty or has no KEY=VALUE pairs")
        sys.exit(1)

    print(f"\n  Found {len(env)} environment variables in .env\n")

    # Run validation checks (pre-fix)
    run_checks(env)

    # Apply fixes if requested
    if fix_mode:
        print()
        if dry_run:
            print("  [DRY RUN] Showing what would change:")
        apply_fixes(env, lines, dry_run=dry_run)

        # Re-parse and re-validate after fixes to show post-fix state
        if not dry_run:
            # Clear previous results and re-run
            global results, errors_count, warnings_count
            results = []
            errors_count = 0
            warnings_count = 0

            print("\n  Re-validating after fixes...\n")
            env_fixed, _ = parse_env_file(ENV_PATH)
            run_checks(env_fixed)

    # Print report (shows post-fix state if --fix was applied, pre-fix otherwise)
    print_report()

    # Exit code: 0 if no errors, 1 if errors
    if errors_count > 0 and not fix_mode:
        sys.exit(1)
    elif fix_mode and not dry_run:
        print("  →  Restart the app for changes to take effect:")
        print("     touch /home2/fixitblu/backend/tmp/restart.txt")
        print()


if __name__ == "__main__":
    main()
