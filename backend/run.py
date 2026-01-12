"""
NEON VINYL: GHOST GROOVES - Application Entry Point
Stake Engine (Carrot) Standard

Run with: python run.py
Or: uvicorn app.api.main:app --reload
"""
import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "app.api.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
