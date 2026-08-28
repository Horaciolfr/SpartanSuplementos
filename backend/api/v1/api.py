from fastapi import APIRouter
from api.v1.endpoints.kardex import router as kardex_router

api_router = APIRouter()
api_router.include_router(kardex_router)
