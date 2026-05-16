import os
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values

# Konfiguracija konekcije za bazu
DB_HOST = "localhost"
DB_PORT = "5432"
DB_NAME = "athlete_performance"
DB_USER = "postgres"
DB_PASSWORD = "password"
CSV_FILE_PATH = "iot_sports_dataset.csv"

def connect_to_db():
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        return conn
    except Exception as e:
        print(f"Greška pri povezivanju sa bazom: {e}")
        return None

def import_csv_to_postgres():
    # 1. Provera da li CSV fajl postoji
    if not os.path.exists(CSV_FILE_PATH):
        print(f"Greška: Fajl '{CSV_FILE_PATH}' nije pronađen u tekućem direktorijumu.")
        return

    # 2. Učitavanje i priprema podataka pomoću pandas-a
    print("Učitavanje CSV fajla...")
    df = pd.read_csv(CSV_FILE_PATH)

    # Mapiranje kolona iz dataseta sa kolonama u bazi
    # (Prilagodi nazive u 'df.rename' ako se tačni nazivi u CSV-u razlikuju)
    df.rename(columns={
        'Timestamp': 'recorded_at',
        'Athlete_ID': 'athlete_id',
        'Heart_Rate': 'heart_rate',
        'Speed': 'speed',
        'Acc_X': 'acc_x',
        'Acc_Y': 'acc_y',
        'Acc_Z': 'acc_z',
        'Gyro_X': 'gyro_x',
        'Gyro_Y': 'gyro_y',
        'Gyro_Z': 'gyro_z'
    }, inplace=True)

    # Konverzija vremenske serije u ispravan datetime format
    df['recorded_at'] = pd.to_datetime(df['recorded_at'])

    # Selekcija i raspored kolona tačno kako su definisane u SQL tabeli
    columns_to_insert = [
        'athlete_id', 'recorded_at', 'heart_rate', 'speed', 
        'acc_x', 'acc_y', 'acc_z', 'gyro_x', 'gyro_y', 'gyro_z'
    ]
    
    # Pretvaranje DataFrame-a u listu torki (tuples) za brzi unos
    data_tuples = [tuple(x) for x in df[columns_to_insert].to_numpy()]

    # 3. Konekcija i upis u bazu
    conn = connect_to_db()
    if not conn:
        return

    cursor = conn.cursor()
    
    # SQL upit za masovni unos podataka
    query = """
        INSERT INTO athlete_metrics 
        (athlete_id, recorded_at, heart_rate, speed, acc_x, acc_y, acc_z, gyro_x, gyro_y, gyro_z) 
        VALUES %s
    """

    try:
        print(f"Započeto ubacivanje {len(data_tuples)} redova u bazu podataka...")
        # execute_values je drastično brži od standardnog execute u petlji
        execute_values(cursor, query, data_tuples)
        conn.commit()
        print("Podaci su uspešno uvezeni!")
    except Exception as e:
        conn.rollback()
        print(f"Greška tokom izvršavanja upita: {e}")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    import_csv_to_postgres()