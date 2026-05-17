const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const config = require('./config');
const db = require('./database');

const PROTO_PATH = path.join(__dirname, '../protos/athlete.proto');

// Učitavanje proto fajla
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const athleteProto = grpc.loadPackageDefinition(packageDefinition).athlete;

/**
 * Implemetacija rpc IngestMetric (Scenario A)
 */
async function ingestMetric(call, callback) {
  const m = call.request;
  
  const queryText = `
    INSERT INTO athlete_metrics 
    (athlete_id, recorded_at, heart_rate, speed, acc_x, acc_y, acc_z, gyro_x, gyro_y, gyro_z)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);
  `;
  
  const values = [
    m.athlete_id, m.recorded_at, m.heart_rate, m.speed,
    m.acc_x, m.acc_y, m.acc_z, m.gyro_x, m.gyro_y, m.gyro_z
  ];

  try {
    await db.query(queryText, values);
    callback(null, { status: "success", message: "Metric recorded via gRPC" });
  } catch (err) {
    console.error("gRPC Ingestion Error:", err);
    callback({
      code: grpc.status.INTERNAL,
      details: "Insert into database failed: " + err.message,
    });
  }
}

/**
 * Implementacija rpc GetSelectiveMetrics (Poređenje za Scenario B)
 */
async function getSelectiveMetrics(call, callback) {
  const { athlete_id, limit } = call.request;
  const maxLimit = limit > 0 ? limit : 100;

  const queryText = `
    SELECT athlete_id, recorded_at, heart_rate, speed 
    FROM athlete_metrics 
    WHERE athlete_id = $1 
    ORDER BY recorded_at DESC 
    LIMIT $2;
  `;

  try {
    const res = await db.query(queryText, [athlete_id, maxLimit]);
    
    // Mapiranje rezultata kako bi se poklopili sa ISO string formatom za proto3
    const formattedMetrics = res.rows.map(row => ({
      athlete_id: row.athlete_id,
      recorded_at: new Date(row.recorded_at).toISOString(),
      heart_rate: parseFloat(row.heart_rate) || 0,
      speed: parseFloat(row.speed) || 0
    }));

    callback(null, { metrics: formattedMetrics });
  } catch (err) {
    console.error("gRPC Fetch Error:", err);
    callback({
      code: grpc.status.INTERNAL,
      details: "Database query failed",
    });
  }
}

async function getHeavyAggregation(call, callback) {
  const { start_time, end_time } = call.request;

  // Koristimo isti optimizovani Raw SQL upit sa BRIN indeksom
  const queryText = `
    SELECT 
        athlete_id,
        ROUND(AVG(heart_rate), 2) as avg_heart_rate,
        ROUND(MAX(speed), 2) as max_speed,
        COUNT(*) as total_records
    FROM athlete_metrics
    WHERE recorded_at BETWEEN $1 AND $2
    GROUP BY athlete_id
    ORDER BY total_records DESC;
  `;

  try {
    const res = await db.query(queryText, [start_time, end_time]);
    
    // Mapiramo podatke iz baze u format koji Protobuf očekuje (float i int32)
    const reports = res.rows.map(row => ({
      athlete_id: row.athlete_id,
      avg_heart_rate: parseFloat(row.avg_heart_rate) || 0.0,
      max_speed: parseFloat(row.max_speed) || 0.0,
      total_records: parseInt(row.total_records, 10) || 0
    }));

    callback(null, { reports: reports });
  } catch (err) {
    console.error("gRPC Heavy Aggregation Error:", err);
    callback({
      code: grpc.status.INTERNAL,
      details: "Database aggregation failed: " + err.message,
    });
  }
}

function main() {
  const server = new grpc.Server();
  
  // Registracija servisa i metoda
  server.addService(athleteProto.AthleteMetricService.service, {
    ingestMetric: ingestMetric,
    getSelectiveMetrics: getSelectiveMetrics,
    getHeavyAggregation:getHeavyAggregation
  });

  const bindAddress = `0.0.0.0:${config.port}`;
  
  server.bindAsync(bindAddress, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
      console.error(`Failed to bind server: ${err.message}`);
      return;
    }
    console.log(`gRPC Server running at ${bindAddress}`);
  });
}

main();