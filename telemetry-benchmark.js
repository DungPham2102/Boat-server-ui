
import http from 'k6/http';
import { check, sleep, fail } from 'k6';
import { Trend } from 'k6/metrics';

// A custom metric to track response times for our specific endpoint.
const telemetryResponseTime = new Trend('telemetry_response_time');

// --- Test Configuration ---
export const options = {
  // Test scenario: Ramp up virtual users (VUs).
  // This simulates a gradual increase in traffic.
  stages: [
    { duration: '30s', target: 20 }, // Ramp-up from 1 to 20 users over 30 seconds
    { duration: '1m', target: 20 },  // Stay at 20 users for 1 minute
    { duration: '10s', target: 0 },   // Ramp-down to 0 users
  ],
  // Thresholds: Define success criteria for the test.
  // The test will fail if these conditions are not met.
  thresholds: {
    'http_req_failed': ['rate<0.01'],       // Fail if error rate is > 1%
    'http_req_duration': ['p(95)<500'],     // Fail if 95th percentile response time is > 500ms
    'telemetry_response_time{status:200}': ['p(95)<500'], // Custom metric threshold
  },
};

// --- Test Data ---
// These boat IDs must exist in your 'boats' database table.
const boatIDs = [
  'B001', 'B002', 'B003', 'B004', 'B005',
  'B006', 'B007', 'B008', 'B009', 'B010'
];

const telemetryEndpoint = 'http://localhost:3001/api/telemetry';

// --- Helper Functions ---

// Generates a random floating-point number between min and max.
function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

// Selects a random boat ID from the list.
function getRandomBoatId() {
  return boatIDs[Math.floor(Math.random() * boatIDs.length)];
}

// --- Main Test Logic ---

export default function () {
  const boatId = getRandomBoatId();

  // Construct the JSON payload for the POST request.
  const payload = JSON.stringify({
    boatId: boatId,
    lat: randomFloat(10.7, 10.9),
    lon: randomFloat(106.6, 106.8),
    head: randomFloat(0, 360),
    targetHead: randomFloat(0, 360),
    leftSpeed: Math.floor(randomFloat(0, 101)),
    rightSpeed: Math.floor(randomFloat(0, 101)),
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    // Add a tag to easily filter results for this specific request
    tags: {
      name: 'TelemetryIngestion',
    },
  };

  // Send the POST request to the telemetry endpoint.
  const res = http.post(telemetryEndpoint, payload, params);

  // Add the response time to our custom trend metric.
  // We tag it with the status code to allow for more detailed analysis.
  telemetryResponseTime.add(res.timings.duration, { status: res.status });

  // Check if the request was successful (HTTP 200 OK).
  const isSuccess = check(res, {
    'status is 200': (r) => r.status === 200,
  });

  // If the check fails, log the error for debugging.
  if (!isSuccess) {
    fail(`Request failed. Status: ${res.status}, Body: ${res.body}`);
    console.error(`Failed request for boatId: ${boatId}`);
    console.error(`Response Body: ${res.body}`);
  }

  // Pause for a short random time between requests to simulate realistic device behavior.
  sleep(randomFloat(0.5, 2));
}

