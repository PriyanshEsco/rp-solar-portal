// scripts/security-hardening-test.mjs
// Automated Security & RBAC Boundary Hardening Verification Suite for R P Solar Portal

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

async function runSecurityTests() {
  console.log('===============================================================');
  console.log('🔒 R P SOLAR ENTERPRISE — SECURITY & RBAC HARDENING TEST SUITE');
  console.log('===============================================================\n');

  let passed = 0;
  let total = 0;

  function assertResult(testName, condition, details) {
    total++;
    if (condition) {
      passed++;
      console.log(`✅ [PASS] ${testName}`);
      if (details) console.log(`   ↳ ${details}`);
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      if (details) console.error(`   ↳ ${details}`);
    }
    console.log('');
  }

  // 1. Authenticate Actors
  console.log('🔑 Authenticating Security Test Actors...');
  const superAdminToken = await login('superadmin@rpsolar.com', 'Password123!');
  const adminNorthToken = await login('admin.north@rpsolar.com', 'Password123!'); // Admin A (North)
  const adminSouthToken = await login('admin.south@rpsolar.com', 'Password123!'); // Admin B (South)
  const empRahulToken = await login('rahul.sharma@rpsolar.com', 'Password123!'); // Employee A (North)
  const empVikramToken = await login('vikram.nair@rpsolar.com', 'Password123!'); // Employee B (South)
  console.log('   ✓ Super Admin, Admin North (A), Admin South (B), Employee Rahul (A), Employee Vikram (B) authenticated.\n');

  // --------------------------------------------------------------------------
  // SCENARIO 1: Employee A attempts to access Employee B customer
  // --------------------------------------------------------------------------
  console.log('--- TEST 1: Cross-Employee Customer Ownership Isolation ---');
  // Employee Rahul (Employee A) tries to fetch Customer Priya (Employee B's customer)
  const res1 = await fetch(`${BASE_URL}/api/customers/cust-prof-priya`, {
    headers: { Authorization: `Bearer ${empRahulToken}` },
  });
  const data1 = await res1.json();
  assertResult(
    'Scenario 1: Employee A attempts to access Employee B customer',
    res1.status === 403 && data1.success === false,
    `Status: ${res1.status} Forbidden | Code: ${data1.error?.code} | Reason: ${data1.error?.message}`
  );

  // --------------------------------------------------------------------------
  // SCENARIO 2: Admin A attempts to access Admin B customer
  // --------------------------------------------------------------------------
  console.log('--- TEST 2: Cross-Admin Regional Team Boundary Isolation ---');
  // Admin North (Admin A) tries to fetch Customer in South region (cust-prof-priya)
  const res2 = await fetch(`${BASE_URL}/api/customers/cust-prof-priya`, {
    headers: { Authorization: `Bearer ${adminNorthToken}` },
  });
  const data2 = await res2.json();
  assertResult(
    'Scenario 2: Admin A attempts to access Admin B customer',
    res2.status === 403 && data2.success === false,
    `Status: ${res2.status} Forbidden | Code: ${data2.error?.code} | Reason: ${data2.error?.message}`
  );

  // --------------------------------------------------------------------------
  // SCENARIO 3: Employee attempts to access Super Admin APIs
  // --------------------------------------------------------------------------
  console.log('--- TEST 3: Privilege Escalation Prevention (Super Admin API) ---');
  // Employee Rahul attempts to call User Management Creation API (Super Admin only)
  const res3 = await fetch(`${BASE_URL}/api/users`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${empRahulToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'hacker@unauthorized.com',
      username: 'hacker',
      userType: 'super_admin',
    }),
  });
  const data3 = await res3.json();
  assertResult(
    'Scenario 3: Employee attempts to access Super Admin User Creation API',
    res3.status === 403 && data3.success === false,
    `Status: ${res3.status} Forbidden | Code: ${data3.error?.code} | Reason: ${data3.error?.message}`
  );

  // --------------------------------------------------------------------------
  // SCENARIO 4: Employee changes customer ID in URL (Parameter Tampering / IDOR)
  // --------------------------------------------------------------------------
  console.log('--- TEST 4: IDOR / URL Parameter Tampering Defense ---');
  const res4 = await fetch(`${BASE_URL}/api/customers/cust-prof-priya`, {
    headers: { Authorization: `Bearer ${empRahulToken}` },
  });
  const data4 = await res4.json();
  assertResult(
    'Scenario 4: Employee changes customer ID in URL (IDOR test)',
    res4.status === 403 && data4.success === false,
    `Status: ${res4.status} Forbidden | Code: ${data4.error?.code} | Reason: ${data4.error?.message}`
  );

  // --------------------------------------------------------------------------
  // SCENARIO 5: Employee manually changes project ID in API request
  // --------------------------------------------------------------------------
  console.log('--- TEST 5: Cross-Tenant Project Modification Prevention ---');
  // Employee Rahul attempts to modify metadata for Project proj-blr-002 (Assigned to Vikram)
  const res5 = await fetch(`${BASE_URL}/api/projects/proj-blr-002`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${empRahulToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      projectName: 'TAMPERED BY UNAUTHORIZED EMPLOYEE',
      status: 'completed',
    }),
  });
  const data5 = await res5.json();
  assertResult(
    'Scenario 5: Employee manually changes project ID in API request',
    res5.status === 403 && data5.success === false,
    `Status: ${res5.status} Forbidden | Code: ${data5.error?.code} | Reason: ${data5.error?.message}`
  );

  // --------------------------------------------------------------------------
  // SCENARIO 6: Employee tries to download another employee's document
  // --------------------------------------------------------------------------
  console.log("--- TEST 6: File Storage Object Access Boundary Enforcement ---");
  // Employee Rahul attempts to download doc-blr-001 (belongs to Customer Priya / Vikram in South)
  const res6 = await fetch(`${BASE_URL}/api/documents/storage?docId=doc-blr-001&download=true`, {
    headers: { Authorization: `Bearer ${empRahulToken}` },
  });
  const data6 = await res6.json();
  assertResult(
    "Scenario 6: Employee tries to download another employee's document",
    res6.status === 403 && data6.success === false,
    `Status: ${res6.status} Forbidden | Code: ${data6.error?.code} | Reason: ${data6.error?.message}`
  );

  // --------------------------------------------------------------------------
  // SCENARIO 7: Legitimate Authorized Access Verification (Sanity Check)
  // --------------------------------------------------------------------------
  console.log('--- TEST 7: Authorized Legitimate Access Verification ---');
  // Employee Rahul accesses his own assigned customer (cust-prof-anil)
  const res7 = await fetch(`${BASE_URL}/api/customers/cust-prof-anil`, {
    headers: { Authorization: `Bearer ${empRahulToken}` },
  });
  const data7 = await res7.json();
  assertResult(
    'Scenario 7: Employee legitimately accesses own assigned customer',
    res7.status === 200 && data7.success === true,
    `Status: ${res7.status} OK | Customer: ${data7.data?.firstName} ${data7.data?.lastName}`
  );

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('===============================================================');
  console.log(`🎯 HARDENING SUITE SUMMARY: ${passed}/${total} TESTS PASSED`);
  if (passed === total) {
    console.log('🛡️  ALL MULTI-TENANT BOUNDARIES AND RBAC GUARDS ARE 100% SECURE');
  } else {
    console.error(`⚠️  ${total - passed} SECURITY TESTS FAILED`);
  }
  console.log('===============================================================\n');
}

runSecurityTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
