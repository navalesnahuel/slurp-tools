from contextlib import asynccontextmanager

import json
from fastapi import FastAPI, UploadFile, Form, File
from fastapi.responses import StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from perspective import transform_perspective
from io import BytesIO



@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    yield
    # Shutdown


app = FastAPI(lifespan=lifespan)


app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_methods=("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"),
)

@app.post("/scanner")
async def scanner_endpoint(file: UploadFile = File(...), points: str = Form(...)):
    image_bytes = await file.read()
    points_list = json.loads(points)

    transformed = transform_perspective(image_bytes, points_list)
    
    return StreamingResponse(BytesIO(transformed), media_type="image/jpeg")
