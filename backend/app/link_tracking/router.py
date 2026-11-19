"""
link_tracking/router.py — public redirect-and-log endpoint.

GET /api/v1/go/{slug}  (no auth) -> log a click, 302 redirect to destination.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse

from link_tracking import service

router = APIRouter(prefix="/go", tags=["link-tracking"])


@router.get("/{slug}")
def track_and_redirect(slug: str, request: Request):
    dest = service.get_destination(slug)
    if not dest:
        raise HTTPException(status_code=404, detail="Unknown link")

    destination = dest.get("destination")
    xff = request.headers.get("x-forwarded-for")
    ip = (xff.split(",")[0].strip() if xff else None) or (request.client.host if request.client else None)

    service.record_click(
        slug=slug,
        destination=destination,
        referrer=request.headers.get("referer") or request.headers.get("referrer"),
        user_agent=request.headers.get("user-agent"),
        ip=ip,
    )
    return RedirectResponse(url=destination, status_code=302)
