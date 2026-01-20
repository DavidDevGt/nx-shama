import http from 'k6/http';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp-up to 100 users
    { duration: '5m', target: 100 },  // Sustained load
    { duration: '2m', target: 0 },    // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% requests < 500ms
    http_req_failed: ['rate<0.05'],    // < 5% error rate
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';

export default function () {
  // Test health endpoint
  let response = http.get(`${BASE_URL}/health`);
  check(response, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 200ms': (r) => r.timings.duration < 200,
  });

  // Test products endpoint (requires auth in production)
  response = http.get(`${BASE_URL}/api/v1/products`);
  check(response, {
    'products status is 200': (r) => r.status === 200,
    'products response time < 500ms': (r) => r.timings.duration < 500,
  });

  // Test customers endpoint
  response = http.get(`${BASE_URL}/api/v1/customers`);
  check(response, {
    'customers status is 200': (r) => r.status === 200,
    'customers response time < 500ms': (r) => r.timings.duration < 500,
  });

  // Test quotations endpoint
  response = http.get(`${BASE_URL}/api/v1/quotations`);
  check(response, {
    'quotations status is 200': (r) => r.status === 200,
    'quotations response time < 500ms': (r) => r.timings.duration < 500,
  });
}