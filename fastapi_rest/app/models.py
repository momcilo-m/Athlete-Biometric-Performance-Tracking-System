from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class AthleteMetricBase(BaseModel):
    athlete_id: str
    recorded_at: datetime
    heart_rate: Optional[float] = None
    speed: Optional[float] = None
    acc_x: Optional[float] = None
    acc_y: Optional[float] = None
    acc_z: Optional[float] = None
    gyro_x: Optional[float] = None
    gyro_y: Optional[float] = None
    gyro_z: Optional[float] = None

class AthleteMetricCreate(AthleteMetricBase):
    pass

class SelectiveAthleteMetric(BaseModel):
    athlete_id: str
    recorded_at: datetime
    heart_rate: Optional[float] = None
    speed: Optional[float] = None

class AthleteAggregationReport(BaseModel):
    athlete_id: str
    avg_heart_rate: Optional[float] = None
    max_speed: Optional[float] = None
    total_records: int