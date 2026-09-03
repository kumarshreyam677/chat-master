"""Shim: supervisor is configured to run `uvicorn server:app` but this project is Node.js.
When uvicorn imports this module we replace the current process with the Node server.
"""
import os
import sys

# Replace the current Python process with the Node.js Express server on port 8001
os.chdir("/app/backend")
os.execvp("node", ["node", "/app/backend/index.js"])
# Unreachable
sys.exit(0)
