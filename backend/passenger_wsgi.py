import sys
import os

# Use abspath(__file__) — same technique that works in the diagnostic script
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Add backend root to path so 'app' package is importable
sys.path.insert(0, BASE_DIR)

# Load .env using absolute path BEFORE importing app
from dotenv import load_dotenv
load_dotenv(os.path.join(BASE_DIR, '.env'))

# Import FastAPI app
from app.main import app

# Bridge ASGI (FastAPI) -> WSGI (Passenger)
from a2wsgi import ASGIMiddleware

application = ASGIMiddleware(app)
