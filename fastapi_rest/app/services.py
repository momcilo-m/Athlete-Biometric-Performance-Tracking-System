from app.database import get_db_connection
from app.models import AthleteMetricCreate, SelectiveAthleteMetric, AthleteAggregationReport
from typing import List
from datetime import datetime

class AthleteService:
    
    @staticmethod
    def create_metric(metric: AthleteMetricCreate) -> bool:
        """
        [Scenario A]: High-Frequency Ingestion
        Upisuje jedan metrički podatak u bazu najbrže moguće.
        """
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = """
            INSERT INTO athlete_metrics 
            (athlete_id, recorded_at, heart_rate, speed, acc_x, acc_y, acc_z, gyro_x, gyro_y, gyro_z)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
        """
        try:
            cursor.execute(query, (
                metric.athlete_id, metric.recorded_at, metric.heart_rate, metric.speed,
                metric.acc_x, metric.acc_y, metric.acc_z, metric.gyro_x, metric.gyro_y, metric.gyro_z
            ))
            conn.commit()
            return True
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def get_selective_metrics(athlete_id: str, limit: int = 100) -> List[dict]:
        """
        [Scenario B]: Selective Monitoring
        Selektuje SAMO heart_rate i speed za datog sportistu kako bi se simulirala ušteda mrežnog saobraćaja.
        """
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = """
            SELECT athlete_id, recorded_at, heart_rate, speed 
            FROM athlete_metrics 
            WHERE athlete_id = %s 
            ORDER BY recorded_at DESC 
            LIMIT %s;
        """
        try:
            cursor.execute(query, (athlete_id, limit))
            return cursor.fetchall()
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def get_heavy_aggregation(start_time: datetime, end_time: datetime) -> List[dict]:
        """
        [Scenario C]: Heavy Querying
        Izvršava složeni agregacijski upit nad istorijskim podacima u zadatom vremenskom opsegu.
        """
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = """
            SELECT 
                athlete_id,
                ROUND(AVG(heart_rate), 2) as avg_heart_rate,
                ROUND(MAX(speed), 2) as max_speed,
                COUNT(*) as total_records
            FROM athlete_metrics
            WHERE recorded_at BETWEEN %s AND %s
            GROUP BY athlete_id
            ORDER BY total_records DESC;
        """
        try:
            cursor.execute(query, (start_time, end_time))
            return cursor.fetchall()
        finally:
            cursor.close()
            conn.close()