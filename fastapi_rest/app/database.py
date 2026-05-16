import psycopg2
from psycopg2.extras import RealDictCursor
from app.config import settings

def get_db_connection():
    """
    Kreira i vraća novu konekciju ka bazi podataka.
    Koristi RealDictCursor da bi rezultati upita bili u obliku rečnika (dict),
    što FastAPI lakše mapira u Pydantic modele.
    """
    conn = psycopg2.connect(
        host=settings.DB_HOST,
        port=settings.DB_PORT,
        database=settings.DB_NAME,
        user=settings.DB_USER,
        password=settings.DB_PASSWORD,
        cursor_factory=RealDictCursor
    )
    return conn