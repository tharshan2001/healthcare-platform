from fastapi import APIRouter, HTTPException
import httpx

router = APIRouter()

NOTIFICATION_SERVICE_URL = "http://localhost:8010"


@router.get("/notifications/{user_id}")
async def get_notifications(user_id: int):
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{NOTIFICATION_SERVICE_URL}/notifications/{user_id}")
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/notifications/unread/{user_id}")
async def get_unread_notifications(user_id: int):
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{NOTIFICATION_SERVICE_URL}/notifications/unread/{user_id}")
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))