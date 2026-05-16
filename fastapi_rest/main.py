from fastapi import FastAPI
from app.routes import router as metrics_router

app = FastAPI(
    title="Athlete Biometric Tracking API (REST)",
    description="REST microservice optimized for IoT comparative analysis.",
    version="1.0.0"
)

# Uključivanje ruta u aplikaciju
app.include_router(metrics_router)

@app.get("/")
def root():
    return {"message": "REST service is up and running. Visit /docs for Swagger documentation."}