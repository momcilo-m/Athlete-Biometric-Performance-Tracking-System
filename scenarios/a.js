import http from 'k6/http';
import grpc from 'k6/net/grpc';
import { check, sleep } from 'k6';

// Definisanje gRPC klijenta i učitavanje .proto fajla
const grpcClient = new grpc.Client();
grpcClient.load(['protos'], 'athlete.proto');

// Konfiguracija opterećenja (10 -> 100 -> 500 VUs) prema zahtevima iz dokumenta
export const options = {
    scenarios: {
        rest_ingestion: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '30s', target: 10 },  // 10 Korisnika
                { duration: '30s', target: 100 }, // 100 Korisnika
                { duration: '30s', target: 500 }, // 500 Korisnika
                { duration: '10s', target: 0 },   // Ohlađivanje
            ],
            exec: 'testREST',
        },
        grpc_ingestion: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '30s', target: 10 },
                { duration: '30s', target: 100 },
                { duration: '30s', target: 500 },
                { duration: '10s', target: 0 },
            ],
            exec: 'testGRPC',
            startTime: '2m', // Pokreće se nakon što se REST završi da se ne bi gušila baza
        },
        graphql_ingestion: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '30s', target: 10 },
                { duration: '30s', target: 100 },
                { duration: '30s', target: 500 },
                { duration: '10s', target: 0 },
            ],
            exec: 'testGraphQL',
            startTime: '4m', // Pokreće se nakon što se gRPC završi
        },
    },
    thresholds: {
        http_req_duration: ['p(95)<200'], // 95% zahteva mora biti ispod 200ms
    },
};

// Pomoćna funkcija za generisanje lažnih senzorskih podataka (simulacija wearable uređaja)
function generatePayload() {
    return {
        athlete_id: `A${String(Math.floor(Math.random() * 5) + 1).padStart(3, '0')}`,
        recorded_at: new Date().toISOString(),
        heart_rate: parseFloat((60 + Math.random() * 120).toFixed(2)),
        speed: parseFloat((Math.random() * 35).toFixed(2)),
        acc_x: Math.random() * 2,
        acc_y: Math.random() * 2,
        acc_z: Math.random() * 2,
        gyro_x: Math.random() * 5,
        gyro_y: Math.random() * 5,
        gyro_z: Math.random() * 5,
    };
}

// // 1. REST Test (FastAPI - Port 8000)
export function testREST() {
    const url = 'http://rest_service:8000/api/v1/metrics/';
    const payload = JSON.stringify(generatePayload());
    const params = { headers: { 'Content-Type': 'application/json' } };

    const res = http.post(url, payload, params);
    
    check(res, {
        'REST status je 21': (r) => r.status === 201,
    });
    sleep(0.1); // simulacija slanja na svakih 100ms
}

// 2. gRPC Test (Node.js - Port 50051)
let connected = false;
export function testGRPC() {
    if (!connected) {
        grpcClient.connect('grpc_service:50051', { plaintext: true });
        connected = true;
    }

    const payload = generatePayload();

    const res = grpcClient.invoke(
        'athlete.AthleteMetricService/IngestMetric',
        payload
    );

    check(res, {
        'gRPC status OK': (r) => r && r.status === grpc.status_OK,
    });

    sleep(0.1);
}

// 3. GraphQL Test (Node.js - Port 4000)
export function testGraphQL() {
    const url = 'http://graphql_service:4000/';
    const data = generatePayload();
    
    // GraphQL Mutation struktura za upis svih kolona
    const mutation = {
        query: `
            mutation CreateMetric {
                createMetric(
                    athlete_id: "${data.athlete_id}",
                    recorded_at: "${data.recorded_at}",
                    heart_rate: ${data.heart_rate},
                    speed: ${data.speed},
                    acc_x: ${data.acc_x},
                    acc_y: ${data.acc_y},
                    acc_z: ${data.acc_z},
                    gyro_x: ${data.gyro_x},
                    gyro_y: ${data.gyro_y},
                    gyro_z: ${data.gyro_z}
                ) { id }
            }
        `
    };

    const res = http.post(url, JSON.stringify(mutation), {
        headers: { 'Content-Type': 'application/json' },
    });

    check(res, {
        'GraphQL nema grešaka': (r) => r.status === 200 && !JSON.parse(r.body).errors,
    });
    sleep(0.1);
}