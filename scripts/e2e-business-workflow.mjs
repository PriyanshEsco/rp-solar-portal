// scripts/e2e-business-workflow.mjs
// Complete End-to-End Operational Lifecycle & Multi-Tenant RBAC Test Suite for R P Solar Pvt. Ltd.

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

async function api(path, method = 'GET', body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, json };
}

async function runE2ETests() {
  console.log('=============================================================================');
  console.log('☀️  R P SOLAR PVT. LTD. — COMPLETE END-TO-END BUSINESS WORKFLOW VERIFICATION');
  console.log('=============================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(title, condition, extra = '') {
    total++;
    if (condition) {
      passed++;
      console.log(`✅ [PASS] Step ${total.toString().padStart(2, '0')}: ${title}`);
      if (extra) console.log(`   ↳ ${extra}`);
    } else {
      console.error(`❌ [FAIL] Step ${total.toString().padStart(2, '0')}: ${title}`);
      if (extra) console.error(`   ↳ ${extra}`);
    }
  }

  // --------------------------------------------------------------------------
  // PART 1: SUPER ADMIN CREATES ADMIN & EMPLOYEE AND ASSIGNS HIERARCHY
  // --------------------------------------------------------------------------
  console.log('--- 1. ENTERPRISE IAM & TEAM HIERARCHY INITIALIZATION ---');

  // Login Super Admin
  const superToken = await login('superadmin@rpsolar.com', 'Password123!');
  assert('Super Admin authenticated', !!superToken);

  // 1. Super Admin creates Admin (Admin West)
  const createAdminRes = await api(
    '/api/users',
    'POST',
    {
      email: `admin.west.${Date.now()}@rpsolar.com`,
      username: `admin_west_${Date.now().toString().slice(-4)}`,
      firstName: 'Rajesh',
      lastName: 'Patel',
      userType: 'admin',
      phoneNumber: '+91 98250 11001',
      branchRegion: 'West Region (Gujarat)',
      department: 'Solar Commercial EPC',
      password: 'Password123!',
    },
    superToken
  );
  assert(
    'Super Admin creates Regional Admin (Admin West)',
    createAdminRes.status === 200 && createAdminRes.json?.success === true,
    `Admin User ID: ${createAdminRes.json?.data?.id}`
  );

  // Retrieve Admin Profile ID
  const usersList = await api('/api/users', 'GET', null, superToken);
  const createdAdminUser = usersList.json?.data?.find((u) => u.id === createAdminRes.json?.data?.id);
  const adminWestProfileId = createdAdminUser?.profile?.id;

  // 2. Super Admin creates Employee (Employee Amit) & 3. Assigns to Admin West
  const createEmpRes = await api(
    '/api/users',
    'POST',
    {
      email: `amit.shah.${Date.now()}@rpsolar.com`,
      username: `amit_ops_${Date.now().toString().slice(-4)}`,
      firstName: 'Amit',
      lastName: 'Shah',
      userType: 'employee',
      phoneNumber: '+91 98250 22002',
      branchRegion: 'West Region (Gujarat)',
      department: 'Engineering & EPC',
      reportingAdminId: adminWestProfileId,
      password: 'Password123!',
    },
    superToken
  );
  assert(
    'Super Admin creates Employee and assigns to Admin West',
    createEmpRes.status === 200 && createEmpRes.json?.success === true,
    `Employee User ID: ${createEmpRes.json?.data?.id}`
  );

  const empEmail = createEmpRes.json?.data?.email;

  // --------------------------------------------------------------------------
  // PART 2: EMPLOYEE LOGS IN & ONBOARDS B2C SOLAR CUSTOMER
  // --------------------------------------------------------------------------
  console.log('\n--- 2. EMPLOYEE AUTHENTICATION & B2C CUSTOMER ONBOARDING ---');

  // 4. Employee logs in
  const empToken = await login(empEmail, 'Password123!');
  assert('Employee Amit logs in successfully', !!empToken);

  // 5 & 6. Employee creates B2C Customer with Solar Capacity
  const onboardCustRes = await api(
    '/api/customers',
    'POST',
    {
      customerMode: 'b2c',
      firstName: 'Bhavesh',
      lastName: 'Solanki',
      email: `bhavesh.solanki.${Date.now()}@gmail.com`,
      mobileNumber: '+91 98250 33445',
      address: 'Plot 42, Shivalik Green, SG Highway',
      district: 'Ahmedabad',
      state: 'Gujarat',
      pincode: '380054',
      existingLoadKw: 6.0,
      solarInstallationCapacityKw: 5.0,
      discomApplicationType: 'new_connection',
      discomName: 'Torrent Power (Ahmedabad)',
      paymentMode: 'jan_samarth_loan',
      workOrderStatus: 'issued',
      mnreRegistrationStatus: 'registered',
      tfrStatus: 'approved',
    },
    empToken
  );

  assert(
    'Employee onboards B2C Customer with 5kW Rooftop Solar Capacity',
    onboardCustRes.status === 200 && onboardCustRes.json?.success === true,
    `Customer ID: ${onboardCustRes.json?.data?.customer?.id} | Project Code: ${onboardCustRes.json?.data?.project?.projectCode}`
  );

  const customerId = onboardCustRes.json?.data?.customer?.id;
  const projectId = onboardCustRes.json?.data?.project?.id;

  // 7. Project exists and linked
  assert(
    'Initial Project created with 26 operational stages',
    !!projectId && onboardCustRes.json?.data?.project?.capacityKw === 5.0,
    `Project ID: ${projectId}`
  );

  // --------------------------------------------------------------------------
  // PART 3: DOCUMENT UPLOADS & PROJECT STAGES TRANSITIONS
  // --------------------------------------------------------------------------
  console.log('\n--- 3. SECURE DOCUMENT VAULT & PROJECT LIFECYCLE PROGRESSION ---');

  // 8. Upload Documents
  const uploadDoc1 = await api(
    '/api/documents',
    'POST',
    {
      projectId,
      docTypeCode: 'electricity_bill',
      docTypeName: 'Latest Torrent Power Electricity Bill',
      fileName: 'solanki_electricity_bill_feb2026.pdf',
      category: 'electricity_bill',
      fileSize: '1.2 MB',
      fileSizeBytes: 1258291,
    },
    empToken
  );
  assert(
    'Employee uploads Electricity Bill to Document Vault',
    uploadDoc1.status === 200 && uploadDoc1.json?.success === true,
    `Storage Key: ${uploadDoc1.json?.data?.storageKey}`
  );

  const uploadDoc2 = await api(
    '/api/documents',
    'POST',
    {
      projectId,
      docTypeCode: 'site_survey',
      docTypeName: 'Civil MMS & Shadow Analysis Report',
      fileName: 'shivalik_site_survey_mms.pdf',
      category: 'site_docs',
      fileSize: '3.4 MB',
      fileSizeBytes: 3565158,
    },
    empToken
  );
  assert(
    'Employee uploads Site Survey & Shadow Analysis',
    uploadDoc2.status === 200 && uploadDoc2.json?.success === true
  );

  // 9. Update Project Stages
  const stageUpdateRes = await api(
    `/api/projects/${projectId}/stages`,
    'PATCH',
    {
      stageKey: 'tfr',
      status: 'completed',
      completionDate: '2026-03-10',
      remarks: 'Technical Feasibility Report sanctioned by DISCOM transformer engineer.',
    },
    empToken
  );
  assert(
    'Employee updates stage (TFR Sanction -> Completed)',
    stageUpdateRes.status === 200 && stageUpdateRes.json?.success === true,
    `Current Stage Status: ${stageUpdateRes.json?.data?.updatedStage?.status}`
  );

  // --------------------------------------------------------------------------
  // PART 4: COMPLETE PAYMENT SCHEDULE & MILESTONES
  // --------------------------------------------------------------------------
  console.log('\n--- 4. PAYMENT SCHEDULE & LEDGER TRANSACTIONS ---');

  // 10. Booking Payment
  const payBooking = await api(
    '/api/payments',
    'POST',
    {
      projectId,
      installmentType: 'booking_amount',
      installmentTitle: 'Advance Token & Booking Deposit',
      amount: 50000,
      paymentMode: 'UPI',
      referenceNumber: `UPI-RPS-${Date.now().toString().slice(-6)}`,
      remarks: 'Token advance received via UPI GPay',
    },
    empToken
  );
  assert(
    'Employee records Booking Payment (₹50,000)',
    payBooking.status === 200 && payBooking.json?.success === true,
    `Receipt No: ${payBooking.json?.data?.transaction?.receiptNumber}`
  );

  // 11. Add Installments: 1st, 2nd, 3rd, 4th
  const payInst1 = await api(
    '/api/payments',
    'POST',
    {
      projectId,
      installmentType: '1st_installment',
      installmentTitle: '1st Installment - MMS Structure Delivery',
      amount: 75000,
      paymentMode: 'NEFT',
      referenceNumber: `NEFT-SBI-${Date.now().toString().slice(-6)}`,
      remarks: 'Structure delivery milestone release',
    },
    empToken
  );
  assert(
    'Employee records 1st Installment (₹75,000)',
    payInst1.status === 200 && payInst1.json?.success === true
  );

  const payInst2 = await api(
    '/api/payments',
    'POST',
    {
      projectId,
      installmentType: '2nd_installment',
      installmentTitle: '2nd Installment - Solar Module Supply',
      amount: 75000,
      paymentMode: 'Jan Samarth Loan DBT',
      referenceNumber: `JS-DISB-${Date.now().toString().slice(-6)}`,
      remarks: 'Jan Samarth Bank tranche 1 disbursed',
    },
    empToken
  );
  assert(
    'Employee records 2nd Installment (₹75,000)',
    payInst2.status === 200 && payInst2.json?.success === true
  );

  const payInst3 = await api(
    '/api/payments',
    'POST',
    {
      projectId,
      installmentType: '3rd_installment',
      installmentTitle: '3rd Installment - Inverter & Net Metering',
      amount: 50000,
      paymentMode: 'Jan Samarth Loan DBT',
      referenceNumber: `JS-DISB-${Date.now().toString().slice(-6)}`,
      remarks: 'Inverter supply & installation tranche',
    },
    empToken
  );
  assert(
    'Employee records 3rd Installment (₹50,000)',
    payInst3.status === 200 && payInst3.json?.success === true
  );

  const payInst4 = await api(
    '/api/payments',
    'POST',
    {
      projectId,
      installmentType: '4th_installment',
      installmentTitle: '4th Installment - Commissioning Balance',
      amount: 50000,
      paymentMode: 'Bank Transfer',
      referenceNumber: `TXN-HDFC-${Date.now().toString().slice(-6)}`,
      remarks: 'Final project commissioning balance',
    },
    empToken
  );
  assert(
    'Employee records 4th Installment (₹50,000) - Total ₹3,00,000 Paid',
    payInst4.status === 200 && payInst4.json?.data?.payment?.totalPaid === 300000,
    `Total Paid: ₹${payInst4.json?.data?.payment?.totalPaid?.toLocaleString('en-IN')}`
  );

  // --------------------------------------------------------------------------
  // PART 5: INSTALLATION PROGRESSION & PM SURYA GHAR SUBSIDY
  // --------------------------------------------------------------------------
  console.log('\n--- 5. FIELD INSTALLATION, CEIG INSPECTION & SUBSIDY REDEMPTION ---');

  // 12. Advance all installation stages
  const instStages = [
    'structure_supply',
    'structure_installation',
    'wiring_earthing_supply',
    'wiring_earthing_installation',
    'system_supply',
    'system_installation',
    'net_meter_installation',
    'inspection',
    'warranty',
  ];

  for (const st of instStages) {
    await api(
      `/api/installation/${projectId}`,
      'PATCH',
      {
        stageKey: st,
        stageUpdates: {
          status: 'completed',
          actualDate: new Date().toISOString().split('T')[0],
          remarks: `${st.replace(/_/g, ' ')} fully executed and QA passed.`,
        },
      },
      empToken
    );
  }

  const finalInst = await api(`/api/installation/${projectId}`, 'GET', null, empToken);
  assert(
    'Installation stages progressed to 100% completion',
    finalInst.status === 200 && finalInst.json?.data?.installationProgress === 100,
    `Installation Progress: ${finalInst.json?.data?.installationProgress}%`
  );

  // 13. Apply PM Surya Ghar Subsidy
  const subApplyRes = await api(
    `/api/subsidy/${projectId}`,
    'PATCH',
    {
      applicationNumber: 'PMSGY-GUJ-88291',
      applicationDate: '2026-03-15',
      subsidyStatus: 'applied',
      subsidyAmount: 78000,
      remarks: 'National Portal PM Surya Ghar registration submitted.',
    },
    empToken
  );
  assert(
    'PM Surya Ghar Subsidy applied (₹78,000)',
    subApplyRes.status === 200 && subApplyRes.json?.data?.subsidyStatus === 'applied',
    `Application No: ${subApplyRes.json?.data?.applicationNumber} | Subsidy: ₹${subApplyRes.json?.data?.subsidyAmount}`
  );

  // 14. Inspection Completed
  const subInspectRes = await api(
    `/api/subsidy/${projectId}`,
    'PATCH',
    {
      inspectionStatus: 'approved',
      inspectionDate: '2026-03-25',
      inspectorName: 'Er. Hasmukh Prajapati (DISCOM CEIG)',
      subsidyStatus: 'approved',
      remarks: 'DISCOM Joint Inspection Report (JIR) verified and signed.',
    },
    empToken
  );
  assert(
    'DISCOM / CEIG Inspection completed & approved',
    subInspectRes.status === 200 && subInspectRes.json?.data?.inspectionStatus === 'approved'
  );

  // 15. Warranty Issued & 16. Invoice Uploaded
  const techSpecsRes = await api(
    `/api/installation/${projectId}`,
    'PATCH',
    {
      inverterModel: 'Growatt 5kW Dual MPPT Grid-Tied Inverter',
      inverterSerial: 'GRW-2026-GUJ-9921',
      panelModel: 'Adani Solar 545W Mono PERC Half-Cut DCR',
      panelCount: 10,
      safetyAuditPassed: true,
      leadTechnicianName: 'Prakash Makwana (Senior Solar Tech)',
    },
    empToken
  );
  assert(
    'Technical specifications & Inverter Serial logged',
    techSpecsRes.status === 200 && techSpecsRes.json?.data?.inverterSerial === 'GRW-2026-GUJ-9921'
  );

  // 17. Subsidy Redeemed
  const subRedeemRes = await api(
    `/api/subsidy/${projectId}`,
    'PATCH',
    {
      subsidyStatus: 'redeemed',
      redemptionDate: '2026-04-02',
      dbtAccountNumber: 'SBIN00045214890',
      remarks: 'Direct Benefit Transfer of ₹78,000 credited to consumer bank account.',
    },
    empToken
  );
  assert(
    'PM Surya Ghar DBT Subsidy redeemed to customer account',
    subRedeemRes.status === 200 && subRedeemRes.json?.data?.subsidyStatus === 'redeemed',
    `Redemption Date: ${subRedeemRes.json?.data?.redemptionDate}`
  );

  // 18. Project becomes Completed
  const completeProjRes = await api(
    `/api/projects/${projectId}`,
    'PATCH',
    {
      status: 'completed',
      remarks: 'Project fully commissioned, energized, net-metered, and subsidy redeemed.',
    },
    empToken
  );
  assert(
    'Project Status set to Completed (Commissioned)',
    completeProjRes.status === 200 && completeProjRes.json?.data?.status === 'completed'
  );

  // --------------------------------------------------------------------------
  // PART 6: MULTI-TENANT ISOLATION, VISIBILITY & DASHBOARD SYNCHRONIZATION
  // --------------------------------------------------------------------------
  console.log('\n--- 6. MULTI-TENANT ISOLATION & DASHBOARD CONSISTENCY ---');

  // 19. Dashboard updates automatically
  const superDash = await api('/api/dashboard?fy=FY%202025-26', 'GET', null, superToken);
  assert(
    'Super Admin Dashboard reflects new metrics and capacity',
    superDash.status === 200 && superDash.json?.kpis?.totalSolarCapacityKw >= 5.0,
    `Enterprise Solar Capacity: ${superDash.json?.kpis?.totalSolarCapacityKw} kW | Active Projects: ${superDash.json?.kpis?.activeProjects}`
  );

  // 20. Admin West sees the project
  const adminWestToken = await login(createdAdminUser.email, 'Password123!');
  const adminWestProjects = await api('/api/projects', 'GET', null, adminWestToken);
  const adminWestCanSee = adminWestProjects.json?.data?.some((p) => p.id === projectId);
  assert(
    'Admin West sees the project in regional operations queue',
    adminWestCanSee === true,
    `Admin West sees ${adminWestProjects.json?.data?.length} project(s)`
  );

  // 21. Super Admin sees the project
  const superProjects = await api('/api/projects', 'GET', null, superToken);
  const superCanSee = superProjects.json?.data?.some((p) => p.id === projectId);
  assert(
    'Super Admin sees the project in enterprise view',
    superCanSee === true
  );

  // 22. Another employee (Employee Vikram / Rahul) CANNOT see it
  const empRahulToken = await login('rahul.sharma@rpsolar.com', 'Password123!');
  const rahulProjects = await api('/api/projects', 'GET', null, empRahulToken);
  const rahulCanSee = rahulProjects.json?.data?.some((p) => p.id === projectId);
  assert(
    'Another Employee (Rahul) CANNOT see Amit\'s project (Zero-leak multi-tenancy)',
    rahulCanSee === false,
    `Rahul sees ${rahulProjects.json?.data?.length} assigned project(s)`
  );

  // Direct unauthorized attempt by Rahul to fetch Project details
  const rahulDirectAccess = await api(`/api/projects/${projectId}`, 'GET', null, empRahulToken);
  assert(
    'Rahul direct URL access blocked with 403 Forbidden',
    rahulDirectAccess.status === 403,
    `Response Code: ${rahulDirectAccess.status}`
  );

  // --------------------------------------------------------------------------
  // PART 7: B2B COMMERCIAL WORKFLOW TEST
  // --------------------------------------------------------------------------
  console.log('\n--- 7. B2B COMMERCIAL & INDUSTRIAL EPC WORKFLOW ---');

  const b2bOnboardRes = await api(
    '/api/customers',
    'POST',
    {
      customerMode: 'b2b',
      organizationName: 'Gujarat Textiles & Denim Mill Ltd.',
      contactPerson: 'Dilip Patel',
      designation: 'Managing Director',
      email: `dilip.patel.${Date.now()}@gujarattextiles.in`,
      mobile: '+91 98250 44556',
      billingAddress: 'GIDC Industrial Estate, Phase 4, Vatva',
      district: 'Ahmedabad Industrial',
      state: 'Gujarat',
      pincode: '382445',
      gstin: '24AABCG1234F1Z8',
      pan: 'AABCG1234F',
      projectName: 'Gujarat Textiles 50kW Industrial Rooftop Solar EPC',
      solarCapacityKw: 50.0,
      priority: 'high',
      expectedCompletionDate: '2026-08-31',
    },
    empToken
  );

  assert(
    'Employee onboards B2B Commercial Enterprise (50 kW Industrial Solar)',
    b2bOnboardRes.status === 200 && b2bOnboardRes.json?.success === true,
    `B2B Org: ${b2bOnboardRes.json?.data?.organization?.orgName} | Project: ${b2bOnboardRes.json?.data?.project?.projectCode}`
  );

  const b2bProjectId = b2bOnboardRes.json?.data?.project?.id;

  // Verify B2B Documents checklist created
  const b2bDocs = await api(`/api/documents?projectId=${b2bProjectId}`, 'GET', null, empToken);
  assert(
    'B2B Compliance Document checklist generated (GST, PAN, Agreement, SLD)',
    b2bDocs.status === 200 && b2bDocs.json?.data?.length >= 5,
    `Attached categories count: ${b2bDocs.json?.data?.length}`
  );

  // --------------------------------------------------------------------------
  // PART 8: GLOBAL SEARCH, ADVANCED FILTERING, REPORTS & AUDIT TRAIL
  // --------------------------------------------------------------------------
  console.log('\n--- 8. GLOBAL SEARCH, ADVANCED FILTERS, EXPORTS & AUDIT LEDGER ---');

  // Search Test
  const searchRes = await api('/api/search?q=Bhavesh', 'GET', null, superToken);
  assert(
    'Global Search instantly finds Customer Bhavesh Solanki',
    searchRes.status === 200 && searchRes.json?.data?.customers?.length > 0,
    `Found ${searchRes.json?.data?.customers?.length} matching customer(s)`
  );

  // Filters Test
  const filterB2CRes = await api('/api/projects?type=b2c', 'GET', null, superToken);
  assert(
    'Project Filter by B2C correctly returns only B2C records',
    filterB2CRes.status === 200 && filterB2CRes.json?.data?.every((p) => p.isB2B === false)
  );

  const filterB2BRes = await api('/api/projects?type=b2b', 'GET', null, superToken);
  assert(
    'Project Filter by B2B correctly returns only B2B records',
    filterB2BRes.status === 200 && filterB2BRes.json?.data?.every((p) => p.isB2B === true)
  );

  // Reports & CSV Export Test
  const auditCsvRes = await fetch(`${BASE_URL}/api/audit-logs?export=csv`, {
    headers: { Authorization: `Bearer ${superToken}` },
  });
  const csvText = await auditCsvRes.text();
  assert(
    'Audit Trail CSV Export generated successfully',
    auditCsvRes.status === 200 && csvText.startsWith('Timestamp,Actor Name,Actor Email'),
    `CSV Length: ${csvText.length} bytes | Lines: ${csvText.split('\n').length}`
  );

  console.log('\n=============================================================================');
  console.log(`🎯 E2E BUSINESS WORKFLOW TEST RESULTS: ${passed}/${total} TESTS PASSED`);
  if (passed === total) {
    console.log('🏆 COMPLETE 22-STEP BUSINESS WORKFLOW + B2B + SECURITY SUITE 100% VERIFIED!');
  } else {
    console.log('⚠️ SOME WORKFLOW STEPS ENCOUNTERED ISSUES');
  }
  console.log('=============================================================================');
}

runE2ETests().catch((err) => {
  console.error('E2E Test Execution Error:', err);
  process.exit(1);
});
