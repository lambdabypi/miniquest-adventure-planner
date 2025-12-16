# application.py - Elastic Beanstalk entry point
"""
Place this file in your backend/ directory (same level as app/)
This is the WSGI entry point that EB expects
"""

from app.main import app

# Elastic Beanstalk expects the WSGI application to be named 'application'
application = app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)