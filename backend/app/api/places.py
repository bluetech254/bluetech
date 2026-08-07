from fastapi import APIRouter, Query, HTTPException
import httpx
import os

router = APIRouter(prefix="/api/v1/places", tags=["Places"])

GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")


@router.get("/autocomplete")
async def autocomplete(input: str = Query(..., min_length=2)):
    """Proxy Google Places Autocomplete — restricted to Kenya"""
    if not GOOGLE_MAPS_API_KEY:
        raise HTTPException(status_code=503, detail="Places service not configured")
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(
                "https://maps.googleapis.com/maps/api/place/autocomplete/json",
                params={
                    "input": input,
                    "key": GOOGLE_MAPS_API_KEY,
                    "components": "country:ke",
                    "types": "geocode|establishment",
                    "language": "en",
                },
            )
        data = resp.json()
        predictions = [
            {"description": p["description"], "place_id": p["place_id"]}
            for p in data.get("predictions", [])
        ]
        return {"predictions": predictions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
