import http from 'k6/http';
import grpc from 'k6/net/grpc';
import { check, sleep } from 'k6';

const grpcClient = new grpc.Client();
grpcClient.load(['protos'], 'athlete.proto');

export const options = {
    scenarios: {
        rest_heavy_query: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '5s', target: 10 },
                { duration: '5s', target: 100 },
                { duration: '5s', target: 500 },
                { duration: '5s', target: 0 },
            ],
            exec: 'testREST',
        },
        grpc_heavy_query: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '5s', target: 10 },
                { duration: '5s', target: 100 },
                { duration: '5s', target: 500 },
                { duration: '5s', target: 0 },
            ],
            exec: 'testGRPC',
            startTime: '22s',
        },
        graphql_heavy_query: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '5', target: 10 },
                { duration: '5s', target: 100 },
                { duration: '5s', target: 500 },
                { duration: '5s', target: 0 },
            ],
            exec: 'testGraphQL',
            startTime: '44s',
        },
    },
    thresholds: {
        http_req_duration: ['p(95)<400'], // Veći prag tolerancije jer su upiti računski teški za bazu
    },
};

// Vremenski opseg koji obuhvata istorijske podatke iz dataseta
const START_TIME = '2026-01-01T00:00:00Z';
const END_TIME = '2026-05-17T23:59:59Z';

// 1. REST Test (FastAPI)
export function testREST() {
    const url = `http://rest_service:8000/api/v1/metrics/aggregation?start_time=${START_TIME}&end_time=${END_TIME}`;
    const res = http.get(url);
    
    check(res, {
        'REST status je 200': (r) => r.status === 200,
        'REST uspešno vratio agregaciju': (r) => JSON.parse(r.body).length > 0,
    });
    sleep(1); // Korisnici ređe osvežavaju teške izveštaje
}

// 2. gRPC Test (Node.js)
let connected = false;
export function testGRPC() {
    if (!connected) {
        grpcClient.connect('grpc_service:50051', { plaintext: true });
        connected = true;
    }
    
    const payload = { start_time: START_TIME, end_time: END_TIME };
    const res = grpcClient.invoke('athlete.AthleteMetricService/GetHeavyAggregation', payload);

    check(res, {
        'gRPC poziv uspešan': (r) => r !== null && typeof r === 'object',
        'gRPC ima izveštaj': (r) => r && r.message && Array.isArray(r.message.reports) && r.message.reports.length > 0,
    });

    sleep(1);
}

// 3. GraphQL Test (Node.js)
export function testGraphQL() {
    const url = 'http://graphql_service:4000/';
    
    const graphQLQuery = {
        query: `
            query GetHistoricalReport {
                getHeavyAggregation(start_time: "${START_TIME}", end_time: "${END_TIME}") {
                    athlete_id
                    avg_heart_rate
                    max_speed
                    total_records
                }
            }
        `
    };

    const res = http.post(url, JSON.stringify(graphQLQuery), {
        headers: { 'Content-Type': 'application/json' },
    });

    check(res, {
        'GraphQL status je 200': (r) => r.status === 200,
        'GraphQL nema grešaka': (r) => !JSON.parse(r.body).errors,
    });
    sleep(1);
}