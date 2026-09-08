import sys
import os

# Hardcoded absolute path — confirmed via diagnostics
BASE_DIR = '/home2/fixitblu/backend'

# Ensure app package is importable
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

# Set working directory explicitly
os.chdir(BASE_DIR)

# Load .env with absolute path before any app imports
from dotenv import load_dotenv
load_dotenv(os.path.join(BASE_DIR, '.env'))

# Import FastAPI app
from app.main import app

# Bridge ASGI (FastAPI) -> WSGI (Passenger)
from a2wsgi import ASGIMiddleware

application = ASGIMiddleware(app)
