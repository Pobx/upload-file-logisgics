import http from 'k6/http';
import { check, sleep } from 'k6';

// 200 Concurrent Users Load Test as per SPEC 3 & SPEC 17
export const options = {
  stages: [
    { duration: '30s', target: 50 },  // Ramp up to 50 users
    { duration: '1m', target: 200 },  // Ramp up to 200 concurrent users
    { duration: '2m', target: 200 },  // Stay at 200 concurrent users
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    // 95% of search requests must complete within 500ms
    'http_req_duration{type:search}': ['p(95)<500'],
    // Overall error rate must be less than 1%
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost';

export default function () {
  const rand = Math.random();

  // 1. Search Query (60% weight)
  if (rand < 0.6) {
    const queries = ['JO-2026', 'BL-TH', 'INV', 'Siam', 'Bangkok'];
    const q = queries[Math.floor(Math.random() * queries.length)];
    const res = http.get(`${BASE_URL}/api/v1/search?q=${q}&size=20`, {
      tags: { type: 'search' },
    });

    check(res, {
      'search status is 200': (r) => r.status === 200,
      'has code 2000': (r) => r.json('code') === '2000',
    });
  }
  // 2. Dashboard Recent & Work Queue (25% weight)
  else if (rand < 0.85) {
    const res = http.get(`${BASE_URL}/api/v1/dashboard/recent-documents`);
    check(res, {
      'dashboard status is 200': (r) => r.status === 200,
    });
  }
  // 3. Health & Status check (15% weight)
  else {
    const res = http.get(`${BASE_URL}/healthz`);
    check(res, {
      'healthz status is 200': (r) => r.status === 200,
    });
  }

  sleep(1);
}
