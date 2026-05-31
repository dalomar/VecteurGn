import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from backend.server import app  # noqa: F401 — exported for Vercel ASGI runtime
