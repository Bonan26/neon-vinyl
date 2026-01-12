"""
NEON VINYL: GHOST GROOVES - Asset Generation Script
Run ONCE to generate all game assets with Gemini API
"""
import os
import base64
import requests
import time
from pathlib import Path

# Load API key from .env
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

API_KEY = os.getenv("GOOGLE-API-KEY") or os.getenv("GOOGLE_API_KEY")
OUTPUT_DIR = Path(__file__).parent.parent / "frontend" / "public" / "assets"

# Gemini API endpoint for image generation
# Try different models if one has quota issues
MODELS = [
    "gemini-2.5-flash-image",
    "gemini-3-pro-image-preview",
    "imagen-3.0-generate-002",
    "gemini-2.0-flash-exp-image-generation",
    "gemini-1.5-flash",
]
CURRENT_MODEL = MODELS[3]
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{CURRENT_MODEL}:generateContent"

# Asset prompts - optimized for slot game icons
ASSETS = {
    "symbols/DJ.png": """Generate a slot machine symbol icon of a ghostly DJ character.
Style: Neon cyberpunk, glowing pink and cyan colors, spectral/transparent effect.
The DJ wears glowing headphones and has an ethereal, cool mysterious vibe.
Art style: Clean vector-like game icon, high contrast, vibrant neon glow effects.
Background: Solid black or transparent. Square format, centered composition.""",

    "symbols/GV.png": """Generate a slot machine symbol icon of a golden vinyl record.
Style: Shiny metallic gold with neon purple and pink light reflections.
The record should glow from within with magical sparkles around it.
Art style: Clean vector-like game icon, premium luxury feel, high contrast.
Background: Solid black or transparent. Square format, centered composition.""",

    "symbols/HP.png": """Generate a slot machine symbol icon of futuristic gaming headphones.
Style: Sleek design with glowing cyan/blue neon light accents and light trails.
High-tech cyberpunk aesthetic with visible LED strips.
Art style: Clean vector-like game icon, high contrast, vibrant glow effects.
Background: Solid black or transparent. Square format, centered composition.""",

    "symbols/CS.png": """Generate a slot machine symbol icon of a retro cassette tape.
Style: 80s synthwave aesthetic, orange and pink neon glow, retro-futuristic.
The cassette has glowing tape reels and vibrant color accents.
Art style: Clean vector-like game icon, high contrast, nostalgic yet modern.
Background: Solid black or transparent. Square format, centered composition.""",

    "symbols/NP.png": """Generate a slot machine symbol icon of a single music note.
Style: Bright glowing neon PINK color, simple clean design.
The note has a soft outer glow effect radiating pink light.
Art style: Clean vector-like game icon, minimalist, high contrast.
Background: Solid black or transparent. Square format, centered composition.""",

    "symbols/NB.png": """Generate a slot machine symbol icon of a single music note.
Style: Bright glowing neon CYAN/BLUE color, simple clean design.
The note has a soft outer glow effect radiating blue light.
Art style: Clean vector-like game icon, minimalist, high contrast.
Background: Solid black or transparent. Square format, centered composition.""",

    "symbols/NU.png": """Generate a slot machine symbol icon of a single music note.
Style: Bright glowing neon PURPLE/VIOLET color, simple clean design.
The note has a soft outer glow effect radiating purple light.
Art style: Clean vector-like game icon, minimalist, high contrast.
Background: Solid black or transparent. Square format, centered composition.""",

    "background.png": """Generate a wide game background image of a haunted vinyl record shop at night.
Style: Dark moody interior, neon purple and cyan accent lighting, synthwave aesthetic.
Scene includes: vintage record shelves, retro posters, ghostly mist effects, neon signs.
Atmosphere: Mysterious, cyberpunk, 80s retro-futuristic vibe.
The image should work as a slot game background - not too busy, dark enough for UI overlay.
Wide landscape format, cinematic composition.""",
}


def generate_image(prompt: str, output_path: Path) -> bool:
    """Generate a single image with Gemini API."""
    print(f"\n{'='*60}")
    print(f"Generating: {output_path.name}")
    print(f"{'='*60}")

    headers = {
        "Content-Type": "application/json",
    }

    payload = {
        "contents": [{
            "parts": [{
                "text": prompt
            }]
        }],
        "generationConfig": {
            "responseModalities": ["image", "text"],
        }
    }

    try:
        response = requests.post(
            f"{GEMINI_URL}?key={API_KEY}",
            headers=headers,
            json=payload,
            timeout=120
        )

        if response.status_code != 200:
            print(f"ERROR: API returned {response.status_code}")
            print(response.text[:500])
            return False

        data = response.json()

        # Extract image from response
        if "candidates" in data and len(data["candidates"]) > 0:
            parts = data["candidates"][0].get("content", {}).get("parts", [])
            for part in parts:
                if "inlineData" in part:
                    image_data = part["inlineData"]["data"]
                    image_bytes = base64.b64decode(image_data)

                    # Ensure directory exists
                    output_path.parent.mkdir(parents=True, exist_ok=True)

                    # Save image
                    with open(output_path, "wb") as f:
                        f.write(image_bytes)

                    print(f"SUCCESS: Saved to {output_path}")
                    print(f"Size: {len(image_bytes) / 1024:.1f} KB")
                    return True

        print("ERROR: No image data in response")
        if "candidates" in data:
            print(f"Response parts: {data['candidates'][0].get('content', {}).get('parts', [])}")
        return False

    except Exception as e:
        print(f"ERROR: {e}")
        return False


def main():
    print("""
    ╔═══════════════════════════════════════════════════════════╗
    ║     NEON VINYL: GHOST GROOVES - Asset Generator          ║
    ║                  Using Gemini API                         ║
    ╚═══════════════════════════════════════════════════════════╝
    """)

    if not API_KEY:
        print("ERROR: No API key found!")
        print("Set GOOGLE-API-KEY in .env file")
        return

    print(f"API Key: {API_KEY[:10]}...{API_KEY[-4:]}")
    print(f"Output: {OUTPUT_DIR}")
    print(f"Assets to generate: {len(ASSETS)}")

    results = {"success": [], "failed": []}

    for filename, prompt in ASSETS.items():
        output_path = OUTPUT_DIR / filename

        # Skip if already exists
        if output_path.exists():
            print(f"\nSKIPPING: {filename} (already exists)")
            results["success"].append(filename)
            continue

        success = generate_image(prompt, output_path)

        if success:
            results["success"].append(filename)
        else:
            results["failed"].append(filename)

        # Rate limiting - wait between requests
        print("Waiting 3 seconds (rate limit)...")
        time.sleep(3)

    # Summary
    print(f"""
    ╔═══════════════════════════════════════════════════════════╗
    ║                    GENERATION COMPLETE                    ║
    ╠═══════════════════════════════════════════════════════════╣
    ║  Success: {len(results['success']):2d} / {len(ASSETS)}                                      ║
    ║  Failed:  {len(results['failed']):2d} / {len(ASSETS)}                                      ║
    ╚═══════════════════════════════════════════════════════════╝
    """)

    if results["failed"]:
        print("Failed assets:")
        for f in results["failed"]:
            print(f"  - {f}")

    if results["success"]:
        print("\nGenerated assets:")
        for f in results["success"]:
            print(f"  ✓ {f}")


if __name__ == "__main__":
    main()
