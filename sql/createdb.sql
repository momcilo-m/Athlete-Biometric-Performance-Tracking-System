CREATE TABLE IF NOT EXISTS athlete_metrics (
    id BIGSERIAL PRIMARY KEY,
    athlete_id VARCHAR(50) NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL,
    heart_rate NUMERIC(5,2),
    speed NUMERIC(5,2),
    acc_x FLOAT8,
    acc_y FLOAT8,
    acc_z FLOAT8,
    gyro_x FLOAT8,
    gyro_y FLOAT8,
    gyro_z FLOAT8
);

CREATE INDEX idx_athlete_time ON athlete_metrics (athlete_id, recorded_at DESC);

CREATE INDEX idx_recorded_at_brin ON athlete_metrics USING BRIN (recorded_at);