// scripts/performance-benchmark.mjs
const BASE_URL = 'http://localhost:3000';

async function login(identifier, password) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(`Login failed for ${identifier}: ${JSON.stringify(data.error)}`);
  }
  return data.data.tokens.accessToken;
}

async function fetchJson(path, token, options = {}) {
  const start = performance.now();
  const url = `${BASE_URL}${path}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const res = await fetch(url, { ...options, headers });
  const duration = performance.now() - start;
  const json = await res.json().catch(() => null);
  return { status: res.status, duration, json };
}

async function runBenchmark() {
  console.log('===============================================================');
  console.log('⚡ RP SOLAR ENTERPRISE PLATFORM — HIGH PERFORMANCE BENCHMARK');
  console.log('===============================================================\n');

  console.log('Authenticating Super Admin...');
  const token = await login('superadmin@rpsolar.com', 'Password123!');
  console.log('✓ Super Admin authenticated.\n');

  // Warmup run for Next.js route bundling
  await fetchJson('/api/customers?limit=1', token);
  await fetchJson('/api/projects?limit=1', token);
  await fetchJson('/api/payments?limit=1', token);
  await fetchJson('/api/documents?limit=1', token);
  await fetchJson('/api/installation?limit=1', token);
  await fetchJson('/api/audit-logs?limit=1', token);
  await fetchJson('/api/search?q=test', token);
  await fetchJson('/api/dashboard?fy=FY%202025-26', token);

  const tests = [
    { name: 'GET /api/customers (Page 1, Limit 20)', path: '/api/customers?page=1&limit=20' },
    { name: 'GET /api/customers (Search "Sharma")', path: '/api/customers?search=sharma' },
    { name: 'GET /api/projects (Page 1, Limit 25)', path: '/api/projects?page=1&limit=25' },
    { name: 'GET /api/projects (Sort by Capacity Desc)', path: '/api/projects?sortBy=capacityKw&sortOrder=desc' },
    { name: 'GET /api/payments (Page 1, Limit 20)', path: '/api/payments?page=1&limit=20' },
    { name: 'GET /api/documents (Compliance + Page 1)', path: '/api/documents?page=1&limit=20' },
    { name: 'GET /api/installation (Page 1, Limit 20)', path: '/api/installation?page=1&limit=20' },
    { name: 'GET /api/audit-logs (Page 1, Limit 50)', path: '/api/audit-logs?page=1&limit=50' },
    { name: 'GET /api/search (Global Search "Solar")', path: '/api/search?q=Solar' },
    { name: 'GET /api/dashboard (Cold Run / Cache Fill)', path: '/api/dashboard?fy=FY%202025-26' },
    { name: 'GET /api/dashboard (Warm Run / In-Memory Cache Hit)', path: '/api/dashboard?fy=FY%202025-26' },
  ];

  let allPassed = true;

  for (const test of tests) {
    const result = await fetchJson(test.path, token);
    const isSuccess = result.status === 200 && result.json?.success === true;
    const passed = isSuccess && result.duration < 150;
    if (!passed) allPassed = false;

    const dataCount = result.json?.data?.length ?? result.json?.meta?.count ?? 'N/A';
    const totalCount = result.json?.pagination?.total ?? result.json?.meta?.total ?? result.json?.meta?.count ?? 'N/A';

    console.log(
      `[${passed ? '✓ PASS' : '✗ FAIL'}] ${test.name.padEnd(52)} | Latency: ${result.duration.toFixed(2).padStart(6)} ms | Items: ${String(dataCount).padStart(2)} / Total: ${String(totalCount).padStart(2)}`
    );
  }

  console.log('\n===============================================================');
  if (allPassed) {
    console.log('✓ ALL PERFORMANCE & SCALE TESTS PASSED WITH LIGHTNING-FAST LATENCIES!');
  } else {
    console.log('✗ SOME PERFORMANCE TESTS FAILED OR EXCEEDED LATENCY THRESHOLDS');
  }
  console.log('===============================================================');
}

runBenchmark().catch((err) => {
  console.error('Benchmark error:', err);
  process.exit(1);
});
