from fastapi import FastAPI
from app.routes.auth import router
from app.database import Base
from app.database import engine

from app.models.user import User

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Odoo Hackathon API")
app.include_router(router)

@app.get("/")
def root():
    return {"message": "Backend is running 🚀"}