"""places/router.py — Google Places Autocomplete proxy restricted to Kenya."""
import logging
from fastapi import APIRouter, HTTPException, Query
from core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/places", tags=["Places"])


@router.get("/autocomplete")
async def autocomplete(input: str = Query(..., min_length=2)):
    """
    Proxy Google Places Autocomplete — restricted to Kenya.
    Requires GOOGLE_MAPS_API_KEY in environment.
    """
    api_key = getattr(settings, "GOOGLE_MAPS_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=503, detail="Places service not configured")
    try:
        import httpx
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(
                "https://maps.googleapis.com/maps/api/place/autocomplete/json",
                params={
                    "input":      input,
                    "key":        api_key,
                    "components": "country:ke",
                    "types":      "geocode|establishment",
                    "language":   "en",
                },
            )
        data        = resp.json()
        predictions = [
            {"description": p["description"], "place_id": p["place_id"]}
            for p in data.get("predictions", [])
        ]
        return {"predictions": predictions}
    except Exception as e:
        logger.error(f"Places autocomplete error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
