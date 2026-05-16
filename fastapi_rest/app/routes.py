from fastapi import APIRouter, HTTPException, Query
from app.models import AthleteMetricCreate, SelectiveAthleteMetric, AthleteAggregationReport
from app.services import AthleteService
from typing import List
from datetime import datetime

router = APIRouter(prefix="/api/v1/metrics", tags=["Athlete Metrics"])

@router.post("/", status_code=201, summary="[Scenario A] Ingest high-frequency biometric data")
def ingest_metric(payload: AthleteMetricCreate):
    try:
        AthleteService.create_metric(payload)
        return {"status": "success", "message": "Metric recorded"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/selective/{athlete_id}", response_model=List[SelectiveAthleteMetric], summary="[Scenario B] Selective monitoring (Heart rate & Speed only)")
def get_selective(athlete_id: str, limit: int = Query(100, ge=1, le=1000)):
    try:
        return AthleteService.get_selective_metrics(athlete_id, limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/aggregation", response_model=List[AthleteAggregationReport], summary="[Scenario C] Heavy querying and historical aggregation")
def get_aggregation(
    start_time: datetime = Query(..., description="Format: YYYY-MM-DDTHH:MM:SS"),
    end_time: datetime = Query(..., description="Format: YYYY-MM-DDTHH:MM:SS")
):
    try:
        return AthleteService.get_heavy_aggregation(start_time, end_time)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))