import http from 'k6/http';
import grpc from 'k6/net/grpc';
import { check, sleep } from 'k6';

const grpcClient = new grpc.Client();
grpcClient.load(['protos'], 'athlete.proto');

export const options = {
    scenarios: {
        rest_selective: {
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
        grpc_selective: {
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
        graphql_selective: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '5s', target: 10 },
                { duration: '5s', target: 100 },
                { duration: '5s', target: 500 },
                { duration: '5s', target: 0 },
            ],
            exec: 'testGraphQL',
            startTime: '44s',
        },
    },
    thresholds: {
        http_req_duration: ['p(95)<150'], // Očekujemo brži odziv jer su u pitanju optimizovani SELECT upiti
    },
};

const ATHLETE_ID = 'A001';
const LIMIT = 100;

// 1. REST Test (FastAPI - Povlači fiksni endpoint koji smo optimizovali za Scenario B)
export function testREST() {
    const url = `http://rest_service:8000/api/v1/metrics/selective/${ATHLETE_ID}?limit=${LIMIT}`;
    const res = http.get(url);
    
    check(res, {
        'REST status je 200': (r) => r.status === 200,
        'REST vratio ispravan limit': (r) => JSON.parse(r.body).length <= LIMIT,
    });
    sleep(0.5);
}

// 2. gRPC Test (Node.js - Koristi posebnu ShortMetric poruku iz .proto fajla)
let connected = false;
export function testGRPC() {
    if (!connected) {
        grpcClient.connect('grpc_service:50051', { plaintext: true });
        connected = true;
    }

    const payload = { athlete_id: ATHLETE_ID, limit: LIMIT };
    const res = grpcClient.invoke('athlete.AthleteMetricService/GetSelectiveMetrics', payload);

    check(res, {
        'gRPC poziv uspešan': (r) => r !== null && typeof r === 'object',
        'gRPC ima podatke': (r) => r && r.message && Array.isArray(r.message.metrics) && r.message.metrics.length > 0,
    });

    sleep(0.5);
}

// 3. GraphQL Test (Node.js - Klijent eksplicitno traži SAMO heart_rate i speed)
export function testGraphQL() {
    const url = 'http://graphql_service:4000/';
    
    const graphQLQuery = {
        query: `
            query GetSelectiveData {
                getAthleteMetrics(athlete_id: "${ATHLETE_ID}", limit: ${LIMIT}) {
                    athlete_id
                    recorded_at
                    heart_rate
                    speed
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
    sleep(0.5);
}