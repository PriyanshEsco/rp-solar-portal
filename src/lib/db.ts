import bcrypt from 'bcryptjs';
import {
  User,
  AdminProfile,
  EmployeeProfile,
  CustomerProfile,
  B2BOrganization,
  Project,
  PaymentRecord,
  DocumentRecord,
  InstallationRecord,
  SubsidyRecord,
  InvoiceRecord,
  WarrantyRecord,
  PaymentTransaction,
  PaymentInstallmentType,
  AuditLogEntry,
  EmployeePerformanceStats,
  StageStatus,
  RequiredDocumentChecklistItem,
  DocumentVerificationStatus,
  NotificationItem,
  NotificationType,
} from './types';
import { initializeProjectStages, createStageHistoryRecord } from './project-stages';

// Standard test password hash for "Password123!"
const DEFAULT_PASSWORD_HASH = bcrypt.hashSync('Password123!', 10);

export class DatabaseStore {
  public users: Map<string, User> = new Map();
  public admins: Map<string, AdminProfile> = new Map();
  public employees: Map<string, EmployeeProfile> = new Map();
  public organizations: Map<string, B2BOrganization> = new Map();
  public customers: Map<string, CustomerProfile> = new Map();
  public projects: Map<string, Project> = new Map();
  public payments: Map<string, PaymentRecord> = new Map();
  public documents: Map<string, DocumentRecord> = new Map();
  public installations: Map<string, InstallationRecord> = new Map();
  public subsidies: Map<string, SubsidyRecord> = new Map();
  public invoices: Map<string, InvoiceRecord> = new Map();
  public warranties: Map<string, WarrantyRecord> = new Map();
  public notifications: Map<string, NotificationItem> = new Map();
  public auditLogs: AuditLogEntry[] = [];
  public refreshTokens: Map<string, { userId: string; expiresAt: number; rememberMe: boolean }> = new Map();
  public passwordResetTokens: Map<string, { email: string; expiresAt: number }> = new Map();

  // --- SECONDARY INDEXES FOR O(1) PERFORMANCE OPTIMIZATION (ELIMINATES N+1 SCANS) ---
  public idxProjectsByCustomer: Map<string, Set<string>> = new Map();
  public idxProjectsByEmployee: Map<string, Set<string>> = new Map();
  public idxCustomersByEmployee: Map<string, Set<string>> = new Map();
  public idxPaymentsByProject: Map<string, string> = new Map();
  public idxDocumentsByProject: Map<string, Set<string>> = new Map();
  public idxDocumentsByCustomer: Map<string, Set<string>> = new Map();
  public idxSubsidiesByProject: Map<string, string> = new Map();
  public idxInstallationsByProject: Map<string, string> = new Map();
  public idxInvoicesByProject: Map<string, string> = new Map();
  public idxWarrantiesByProject: Map<string, string> = new Map();

  constructor() {
    this.seedDatabase();
  }

  public seedDatabase() {
    // 1. Super Admin
    const superAdminUser: User = {
      id: 'usr-super-01',
      email: 'superadmin@rpsolar.com',
      username: 'superadmin',
      phoneNumber: '+91 98110 00001',
      passwordHash: DEFAULT_PASSWORD_HASH,
      userType: 'super_admin',
      status: 'active',
      joiningDate: '2024-01-15',
      failedLoginAttempts: 0,
      lockoutUntil: null,
      lastLoginAt: new Date().toISOString(),
      createdAt: '2024-01-15T09:00:00Z',
      updatedAt: new Date().toISOString(),
    };
    this.users.set(superAdminUser.id, superAdminUser);

    // 2. Admin 1 (North Region)
    const admin1User: User = {
      id: 'usr-admin-north',
      email: 'admin.north@rpsolar.com',
      username: 'admin_north',
      phoneNumber: '+91 98110 22002',
      passwordHash: DEFAULT_PASSWORD_HASH,
      userType: 'admin',
      status: 'active',
      joiningDate: '2024-03-01',
      failedLoginAttempts: 0,
      lockoutUntil: null,
      lastLoginAt: new Date().toISOString(),
      createdAt: '2024-03-01T10:00:00Z',
      updatedAt: new Date().toISOString(),
    };
    this.users.set(admin1User.id, admin1User);
    const admin1Profile: AdminProfile = {
      id: 'adm-prof-north',
      userId: admin1User.id,
      firstName: 'Rajesh',
      lastName: 'Verma',
      branchRegion: 'North Region (Delhi/NCR)',
      department: 'Operations & Expansion',
      canManageEmployees: true,
    };
    this.admins.set(admin1Profile.id, admin1Profile);

    // 3. Admin 2 (South Region)
    const admin2User: User = {
      id: 'usr-admin-south',
      email: 'admin.south@rpsolar.com',
      username: 'admin_south',
      phoneNumber: '+91 98110 33003',
      passwordHash: DEFAULT_PASSWORD_HASH,
      userType: 'admin',
      status: 'active',
      joiningDate: '2024-04-15',
      failedLoginAttempts: 0,
      lockoutUntil: null,
      lastLoginAt: new Date().toISOString(),
      createdAt: '2024-04-15T11:00:00Z',
      updatedAt: new Date().toISOString(),
    };
    this.users.set(admin2User.id, admin2User);
    const admin2Profile: AdminProfile = {
      id: 'adm-prof-south',
      userId: admin2User.id,
      firstName: 'Suresh',
      lastName: 'Menon',
      branchRegion: 'South Region (Bangalore)',
      department: 'Commercial Projects',
      canManageEmployees: true,
    };
    this.admins.set(admin2Profile.id, admin2Profile);

    // 4. Employee 1 (Assigned under Admin North)
    const emp1User: User = {
      id: 'usr-emp-rahul',
      email: 'rahul.sharma@rpsolar.com',
      username: 'rahul_ops',
      phoneNumber: '+91 98110 44004',
      passwordHash: DEFAULT_PASSWORD_HASH,
      userType: 'employee',
      status: 'active',
      joiningDate: '2025-01-10',
      failedLoginAttempts: 0,
      lockoutUntil: null,
      lastLoginAt: new Date().toISOString(),
      createdAt: '2025-01-10T10:30:00Z',
      updatedAt: new Date().toISOString(),
    };
    this.users.set(emp1User.id, emp1User);
    const emp1Profile: EmployeeProfile = {
      id: 'emp-prof-rahul',
      userId: emp1User.id,
      reportingAdminId: admin1Profile.id,
      employeeCode: 'EMP-DEL-010',
      firstName: 'Rahul',
      lastName: 'Sharma',
      department: 'sales',
      designation: 'Senior Project Executive',
      assignedRegion: 'Delhi/NCR',
      maxActiveProjects: 25,
    };
    this.employees.set(emp1Profile.id, emp1Profile);

    // 5. Employee 2 (Assigned under Admin South)
    const emp2User: User = {
      id: 'usr-emp-vikram',
      email: 'vikram.nair@rpsolar.com',
      username: 'vikram_ops',
      phoneNumber: '+91 98110 55005',
      passwordHash: DEFAULT_PASSWORD_HASH,
      userType: 'employee',
      status: 'active',
      joiningDate: '2025-02-01',
      failedLoginAttempts: 0,
      lockoutUntil: null,
      lastLoginAt: new Date().toISOString(),
      createdAt: '2025-02-01T11:00:00Z',
      updatedAt: new Date().toISOString(),
    };
    this.users.set(emp2User.id, emp2User);
    const emp2Profile: EmployeeProfile = {
      id: 'emp-prof-vikram',
      userId: emp2User.id,
      reportingAdminId: admin2Profile.id,
      employeeCode: 'EMP-BLR-022',
      firstName: 'Vikram',
      lastName: 'Nair',
      department: 'installation_ops',
      designation: 'Site Engineering Lead',
      assignedRegion: 'Bangalore Metro',
      maxActiveProjects: 20,
    };
    this.employees.set(emp2Profile.id, emp2Profile);

    // 6. B2B Organization (Seeded)
    const org1: B2BOrganization = {
      id: 'org-blr-01',
      orgName: 'Krishna Precision Polymers Pvt. Ltd.',
      gstin: '29AAACK1234F1Z5',
      pan: 'AAACK1234F',
      contactPerson: 'Priya Krishna',
      designation: 'Managing Director',
      contactEmail: 'priya.krishna@gmail.com',
      contactMobile: '+91 98110 77007',
      billingAddress: 'Plot 42, Peenya Industrial Area, Phase II',
      district: 'Bengaluru Urban',
      state: 'Karnataka',
      pincode: '560058',
      createdAt: '2026-03-18T16:00:00Z',
    };
    this.organizations.set(org1.id, org1);

    // 7. Customer 1 (B2C Residential - North)
    const cust1User: User = {
      id: 'usr-cust-anil',
      email: 'anil.gupta@gmail.com',
      username: 'anil_gupta',
      phoneNumber: '+91 98110 66006',
      passwordHash: DEFAULT_PASSWORD_HASH,
      userType: 'customer',
      status: 'active',
      joiningDate: '2026-03-10',
      failedLoginAttempts: 0,
      lockoutUntil: null,
      lastLoginAt: new Date().toISOString(),
      createdAt: '2026-03-10T14:00:00Z',
      updatedAt: new Date().toISOString(),
    };
    this.users.set(cust1User.id, cust1User);
    const cust1Profile: CustomerProfile = {
      id: 'cust-prof-anil',
      userId: cust1User.id,
      assignedEmployeeId: emp1Profile.id,
      customerType: 'residential',
      firstName: 'Anil',
      lastName: 'Gupta',
      phoneNumber: '+91 98110 66006',
      alternateMobile: '+91 98110 66007',
      email: 'anil.gupta@gmail.com',
      electricityConsumerNumber: 'BSES-DL-98231',
      discomName: 'BSES Rajdhani Power Ltd',
      installationAddress: 'House No 142, Pocket B, Mayur Vihar Phase 2',
      district: 'East Delhi',
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110091',
      sanctionedLoadKw: 7.0,
      proposedCapacityKw: 5.5,
      workflow: {
        discomApplicationType: 'brown_file',
        paymentMode: 'jan_samarth_loan',
        workOrderStatus: 'signed',
        mnreRegistrationStatus: 'approved',
        tfrStatus: 'approved',
        existingLoadKw: 7.0,
        proposedSolarCapacityKw: 5.5,
      },
      createdAt: '2026-03-10T14:00:00Z',
    };
    this.customers.set(cust1Profile.id, cust1Profile);

    // 8. Customer 2 (B2B Commercial - South)
    const cust2User: User = {
      id: 'usr-cust-priya',
      email: 'priya.krishna@gmail.com',
      username: 'priya_k',
      phoneNumber: '+91 98110 77007',
      passwordHash: DEFAULT_PASSWORD_HASH,
      userType: 'customer',
      status: 'active',
      joiningDate: '2026-03-18',
      failedLoginAttempts: 0,
      lockoutUntil: null,
      lastLoginAt: new Date().toISOString(),
      createdAt: '2026-03-18T16:00:00Z',
      updatedAt: new Date().toISOString(),
    };
    this.users.set(cust2User.id, cust2User);
    const cust2Profile: CustomerProfile = {
      id: 'cust-prof-priya',
      userId: cust2User.id,
      assignedEmployeeId: emp2Profile.id,
      b2bOrganizationId: org1.id,
      customerType: 'commercial',
      firstName: 'Priya',
      lastName: 'Krishna',
      phoneNumber: '+91 98110 77007',
      email: 'priya.krishna@gmail.com',
      electricityConsumerNumber: 'BESCOM-KA-77210',
      discomName: 'Bangalore Electricity Supply Co (BESCOM)',
      installationAddress: 'Plot 42, Peenya Industrial Area, Phase II',
      district: 'Bengaluru Urban',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560058',
      sanctionedLoadKw: 35.0,
      proposedCapacityKw: 25.0,
      createdAt: '2026-03-18T16:00:00Z',
    };
    this.customers.set(cust2Profile.id, cust2Profile);

    // 9. Projects with Structured 26 Operational Stages & History
    const proj1Stages = initializeProjectStages({
      applicationType: 'brown_file',
      paymentMode: 'jan_samarth_loan',
      assignedUser: { userId: emp1Profile.userId, name: `${emp1Profile.firstName} ${emp1Profile.lastName}`, role: 'employee' },
    });

    // Mark completed stages for proj1 (up to structure installation)
    const p1CompletedKeys = ['brown_file', 'jan_samarth_loan', 'tfr', 'mnre_registration', 'work_order', 'indent_received', 'structure_supply', 'structure_installation'];
    proj1Stages.forEach((s) => {
      if (p1CompletedKeys.includes(s.stageKey)) {
        s.status = 'completed';
        s.completionDate = '2026-03-25';
        s.remarks = 'Milestone verified and signed off by lead engineer';
      } else if (s.stageKey === 'wiring_earthing_installation' || s.stageKey === 'system_supply') {
        s.status = 'in_progress';
        s.remarks = 'Site team executing DC string cabling and earthing pit drilling';
      }
    });

    const proj1: Project = {
      id: 'proj-del-001',
      projectCode: 'RPS-2026-DEL-001',
      projectName: 'Anil Gupta 5.5kW Rooftop Solar Plant',
      customerId: cust1Profile.id,
      assignedEngineerId: emp1Profile.id,
      capacityKw: 5.5,
      systemType: 'on_grid',
      totalCost: 320000,
      priority: 'standard',
      status: 'installation_in_progress',
      currentStage: 'Wiring & Earthing Installation',
      remarks: 'BSES Net Meter sanction approved. Jan Samarth subsidy linked.',
      startDate: '2026-03-15',
      createdAt: '2026-03-15T10:00:00Z',
      targetCompletionDate: '2026-04-20',
      stages: proj1Stages,
      stageHistory: [
        {
          id: 'hist-del-001',
          projectId: 'proj-del-001',
          stageKey: 'brown_file',
          stageName: 'Brown File',
          previousStatus: 'not_started',
          newStatus: 'completed',
          changedByUserId: emp1Profile.userId,
          changedByUserName: `${emp1Profile.firstName} ${emp1Profile.lastName}`,
          changedByUserRole: 'employee',
          remarks: 'Existing meter load sanction verification completed',
          timestamp: '2026-03-16T11:00:00Z',
        },
        {
          id: 'hist-del-002',
          projectId: 'proj-del-001',
          stageKey: 'structure_installation',
          stageName: 'Structure Installation',
          previousStatus: 'in_progress',
          newStatus: 'completed',
          changedByUserId: emp1Profile.userId,
          changedByUserName: `${emp1Profile.firstName} ${emp1Profile.lastName}`,
          changedByUserRole: 'employee',
          remarks: 'Galvanized iron module mounting structures erected with 28 deg tilt angle',
          timestamp: '2026-03-25T17:30:00Z',
        },
        {
          id: 'hist-del-003',
          projectId: 'proj-del-001',
          stageKey: 'wiring_earthing_installation',
          stageName: 'Wiring & Earthing Installation',
          previousStatus: 'not_started',
          newStatus: 'in_progress',
          changedByUserId: emp1Profile.userId,
          changedByUserName: `${emp1Profile.firstName} ${emp1Profile.lastName}`,
          changedByUserRole: 'employee',
          remarks: 'Commenced ACDB / DCDB wiring and chemical earth pits installation',
          timestamp: '2026-03-26T09:00:00Z',
        },
      ],
    };
    this.projects.set(proj1.id, proj1);

    // Project 2: South B2B Commercial
    const proj2Stages = initializeProjectStages({
      applicationType: 'new_connection',
      paymentMode: 'cash',
      assignedUser: { userId: emp2Profile.userId, name: `${emp2Profile.firstName} ${emp2Profile.lastName}`, role: 'employee' },
    });

    const p2CompletedKeys = [
      'new_connection', 'cash', 'tfr', 'mnre_registration', 'work_order', 'indent_received',
      'structure_supply', 'structure_installation', 'wiring_earthing_supply', 'wiring_earthing_installation',
      'system_supply', 'system_installation', 'details_uploaded', 'inspections'
    ];
    proj2Stages.forEach((s) => {
      if (p2CompletedKeys.includes(s.stageKey)) {
        s.status = 'completed';
        s.completionDate = '2026-03-28';
        s.remarks = 'Completed and verified by Bangalore engineering team';
      } else if (s.stageKey === 'net_meter_installed') {
        s.status = 'in_progress';
        s.remarks = 'BESCOM bi-directional HT meter scheduled for testing';
      }
    });

    const proj2: Project = {
      id: 'proj-blr-002',
      projectCode: 'RPS-2026-BLR-002',
      projectName: 'Krishna Polymers 25kW Commercial Hybrid Solar',
      customerId: cust2Profile.id,
      b2bOrganizationId: org1.id,
      assignedEngineerId: emp2Profile.id,
      capacityKw: 25.0,
      systemType: 'hybrid',
      totalCost: 1450000,
      priority: 'high',
      status: 'net_metering',
      currentStage: 'Net Meter Installed',
      remarks: 'Heavy industrial rooftop. Structure reinforced for 150 km/h wind speeds.',
      startDate: '2026-03-20',
      createdAt: '2026-03-20T11:30:00Z',
      targetCompletionDate: '2026-04-25',
      stages: proj2Stages,
      stageHistory: [
        {
          id: 'hist-blr-001',
          projectId: 'proj-blr-002',
          stageKey: 'inspections',
          stageName: 'Inspections',
          previousStatus: 'in_progress',
          newStatus: 'completed',
          changedByUserId: emp2Profile.userId,
          changedByUserName: `${emp2Profile.firstName} ${emp2Profile.lastName}`,
          changedByUserRole: 'employee',
          remarks: 'CEIG & BESCOM electrical safety clearance granted',
          timestamp: '2026-03-28T15:00:00Z',
        },
      ],
    };
    this.projects.set(proj2.id, proj2);

    // 10. Payments & Installments with Full Transaction History
    this.payments.set('pay-del-001', {
      id: 'pay-del-001',
      projectId: proj1.id,
      customerId: cust1Profile.id,
      totalAmount: 320000,
      totalProjectAmount: 320000,
      paidAmount: 200000,
      totalPaid: 200000,
      balanceAmount: 120000,
      pendingAmount: 120000,
      paymentPercentage: 63,
      status: 'partially_paid',
      dueDate: '2026-04-15',
      installments: [
        {
          id: 'inst-del-1',
          projectId: proj1.id,
          installmentNumber: 1,
          installmentType: 'booking_amount',
          title: 'Booking Amount & Survey (20%)',
          amount: 64000,
          status: 'paid',
          paidDate: '2026-03-15',
          paymentMethod: 'UPI',
          referenceNumber: 'UPI-982103441',
        },
        {
          id: 'inst-del-2',
          projectId: proj1.id,
          installmentNumber: 2,
          installmentType: '1st_installment',
          title: '1st Installment (Jan Samarth Tranche 1 - 42.5%)',
          amount: 136000,
          status: 'paid',
          paidDate: '2026-03-24',
          paymentMethod: 'Jan_Samarth_Loan',
          referenceNumber: 'JS-LOAN-DISB-4412',
        },
        {
          id: 'inst-del-3',
          projectId: proj1.id,
          installmentNumber: 3,
          installmentType: '2nd_installment',
          title: '2nd Installment (Structure & Panel Mounting - 25%)',
          amount: 80000,
          status: 'pending',
          paymentMethod: 'Jan_Samarth_Loan',
        },
        {
          id: 'inst-del-4',
          projectId: proj1.id,
          installmentNumber: 4,
          installmentType: '3rd_installment',
          title: '3rd Installment (Net Meter Sync & Commissioning - 12.5%)',
          amount: 40000,
          status: 'pending',
          paymentMethod: 'UPI',
        },
      ],
      transactions: [
        {
          id: 'txn-del-01',
          receiptNumber: 'REC-2026-DEL-001',
          paymentRecordId: 'pay-del-001',
          projectId: proj1.id,
          customerId: cust1Profile.id,
          installmentType: 'booking_amount',
          installmentTitle: 'Booking Amount & Survey (20%)',
          amount: 64000,
          paymentMode: 'UPI',
          paymentDate: '2026-03-15',
          referenceNumber: 'UPI-982103441',
          receiptUrl: '/receipts/REC-2026-DEL-001.pdf',
          remarks: 'Customer paid booking advance via phone banking UPI.',
          recordedByUserId: emp1Profile.userId,
          recordedByUserName: `${emp1Profile.firstName} ${emp1Profile.lastName}`,
          recordedByUserRole: 'employee',
          createdAt: '2026-03-15T11:00:00Z',
        },
        {
          id: 'txn-del-02',
          receiptNumber: 'REC-2026-DEL-002',
          paymentRecordId: 'pay-del-001',
          projectId: proj1.id,
          customerId: cust1Profile.id,
          installmentType: '1st_installment',
          installmentTitle: '1st Installment (Jan Samarth Tranche 1 - 42.5%)',
          amount: 136000,
          paymentMode: 'Jan_Samarth_Loan',
          paymentDate: '2026-03-24',
          referenceNumber: 'JS-LOAN-DISB-4412',
          receiptUrl: '/receipts/REC-2026-DEL-002.pdf',
          remarks: 'State Bank of India Jan Samarth direct portal disbursement.',
          recordedByUserId: emp1Profile.userId,
          recordedByUserName: `${emp1Profile.firstName} ${emp1Profile.lastName}`,
          recordedByUserRole: 'employee',
          createdAt: '2026-03-24T14:30:00Z',
        },
      ],
    });

    this.payments.set('pay-blr-002', {
      id: 'pay-blr-002',
      projectId: proj2.id,
      customerId: cust2Profile.id,
      totalAmount: 1450000,
      totalProjectAmount: 1450000,
      paidAmount: 1450000,
      totalPaid: 1450000,
      balanceAmount: 0,
      pendingAmount: 0,
      paymentPercentage: 100,
      status: 'paid',
      dueDate: '2026-04-05',
      installments: [
        {
          id: 'inst-blr-1',
          projectId: proj2.id,
          installmentNumber: 1,
          installmentType: 'booking_amount',
          title: 'Commercial EPC Contract Signing Advance (30%)',
          amount: 435000,
          status: 'paid',
          paidDate: '2026-03-20',
          paymentMethod: 'NEFT_RTGS',
          referenceNumber: 'HDFC-RTGS-99120',
        },
        {
          id: 'inst-blr-2',
          projectId: proj2.id,
          installmentNumber: 2,
          installmentType: '1st_installment',
          title: '1st Installment (MMS Structure & Heavy Cabling - 40%)',
          amount: 580000,
          status: 'paid',
          paidDate: '2026-03-26',
          paymentMethod: 'NEFT_RTGS',
          referenceNumber: 'HDFC-RTGS-99314',
        },
        {
          id: 'inst-blr-3',
          projectId: proj2.id,
          installmentNumber: 3,
          installmentType: '2nd_installment',
          title: '2nd Installment (Inverter & Final Synchronization - 30%)',
          amount: 435000,
          status: 'paid',
          paidDate: '2026-03-28',
          paymentMethod: 'NEFT_RTGS',
          referenceNumber: 'HDFC-RTGS-99501',
        },
      ],
      transactions: [
        {
          id: 'txn-blr-01',
          receiptNumber: 'REC-2026-BLR-001',
          paymentRecordId: 'pay-blr-002',
          projectId: proj2.id,
          customerId: cust2Profile.id,
          installmentType: 'booking_amount',
          installmentTitle: 'Commercial EPC Contract Signing Advance (30%)',
          amount: 435000,
          paymentMode: 'NEFT_RTGS',
          paymentDate: '2026-03-20',
          referenceNumber: 'HDFC-RTGS-99120',
          receiptUrl: '/receipts/REC-2026-BLR-001.pdf',
          remarks: 'Corporate advance transferred by Krishna Precision Polymers.',
          recordedByUserId: emp2Profile.userId,
          recordedByUserName: `${emp2Profile.firstName} ${emp2Profile.lastName}`,
          recordedByUserRole: 'employee',
          createdAt: '2026-03-20T12:00:00Z',
        },
        {
          id: 'txn-blr-02',
          receiptNumber: 'REC-2026-BLR-002',
          paymentRecordId: 'pay-blr-002',
          projectId: proj2.id,
          customerId: cust2Profile.id,
          installmentType: '1st_installment',
          installmentTitle: '1st Installment (MMS Structure & Heavy Cabling - 40%)',
          amount: 580000,
          paymentMode: 'NEFT_RTGS',
          paymentDate: '2026-03-26',
          referenceNumber: 'HDFC-RTGS-99314',
          receiptUrl: '/receipts/REC-2026-BLR-002.pdf',
          remarks: 'Material dispatch milestone settled.',
          recordedByUserId: emp2Profile.userId,
          recordedByUserName: `${emp2Profile.firstName} ${emp2Profile.lastName}`,
          recordedByUserRole: 'employee',
          createdAt: '2026-03-26T16:00:00Z',
        },
        {
          id: 'txn-blr-03',
          receiptNumber: 'REC-2026-BLR-003',
          paymentRecordId: 'pay-blr-002',
          projectId: proj2.id,
          customerId: cust2Profile.id,
          installmentType: '2nd_installment',
          installmentTitle: '2nd Installment (Inverter & Final Synchronization - 30%)',
          amount: 435000,
          paymentMode: 'NEFT_RTGS',
          paymentDate: '2026-03-28',
          referenceNumber: 'HDFC-RTGS-99501',
          receiptUrl: '/receipts/REC-2026-BLR-003.pdf',
          remarks: 'Final project contract balance payment received.',
          recordedByUserId: emp2Profile.userId,
          recordedByUserName: `${emp2Profile.firstName} ${emp2Profile.lastName}`,
          recordedByUserRole: 'employee',
          createdAt: '2026-03-28T18:00:00Z',
        },
      ],
    });

    // 11. Documents
    this.documents.set('doc-del-001', {
      id: 'doc-del-001',
      projectId: proj1.id,
      customerId: cust1Profile.id,
      docTypeCode: 'electricity_bill',
      docTypeName: 'Electricity Bill & Sanction NOC',
      fileName: 'anil_gupta_bses_bill_mar2026.pdf',
      fileType: 'application/pdf',
      fileSize: '1.4 MB',
      fileSizeBytes: 1468006,
      storageKey: 'projects/RPS-2026-DEL-001/documents/electricity_bill.pdf',
      storageUrl: '/api/documents/storage?docId=doc-del-001',
      category: 'utility_bill',
      verificationStatus: 'verified',
      uploadedAt: '2026-03-12T14:00:00Z',
      uploadedByUserId: emp1Profile.userId,
      uploadedByUserName: `${emp1Profile.firstName} ${emp1Profile.lastName}`,
      uploadedByUserRole: 'employee',
      verifiedAt: '2026-03-13T10:30:00Z',
      verifiedBy: `${admin1Profile.firstName} ${admin1Profile.lastName}`,
      verifiedByUserId: admin1Profile.userId,
      remarks: 'BSES Consumer CA# 10293844 verified with 7kW sanctioned load.',
      version: 1,
    });

    this.documents.set('doc-del-002', {
      id: 'doc-del-002',
      projectId: proj1.id,
      customerId: cust1Profile.id,
      docTypeCode: 'identity_proof',
      docTypeName: 'Customer Aadhar Card & KYC',
      fileName: 'anil_gupta_aadhar_card.pdf',
      fileType: 'application/pdf',
      fileSize: '950 KB',
      fileSizeBytes: 972800,
      storageKey: 'projects/RPS-2026-DEL-001/documents/aadhar_card.pdf',
      storageUrl: '/api/documents/storage?docId=doc-del-002',
      category: 'identity',
      verificationStatus: 'verified',
      uploadedAt: '2026-03-12T14:10:00Z',
      uploadedByUserId: emp1Profile.userId,
      uploadedByUserName: `${emp1Profile.firstName} ${emp1Profile.lastName}`,
      uploadedByUserRole: 'employee',
      verifiedAt: '2026-03-13T11:00:00Z',
      verifiedBy: `${admin1Profile.firstName} ${admin1Profile.lastName}`,
      verifiedByUserId: admin1Profile.userId,
      remarks: 'UIDAI barcode verified against Mayur Vihar address.',
      version: 1,
    });

    this.documents.set('doc-del-003', {
      id: 'doc-del-003',
      projectId: proj1.id,
      customerId: cust1Profile.id,
      docTypeCode: 'pan_card',
      docTypeName: 'Customer PAN Card',
      fileName: 'anil_gupta_pan.jpg',
      fileType: 'image/jpeg',
      fileSize: '480 KB',
      fileSizeBytes: 491520,
      storageKey: 'projects/RPS-2026-DEL-001/documents/pan_card.jpg',
      storageUrl: '/api/documents/storage?docId=doc-del-003',
      category: 'identity',
      verificationStatus: 'verified',
      uploadedAt: '2026-03-12T14:15:00Z',
      uploadedByUserId: emp1Profile.userId,
      uploadedByUserName: `${emp1Profile.firstName} ${emp1Profile.lastName}`,
      uploadedByUserRole: 'employee',
      verifiedAt: '2026-03-13T11:15:00Z',
      verifiedBy: `${admin1Profile.firstName} ${admin1Profile.lastName}`,
      verifiedByUserId: admin1Profile.userId,
      version: 1,
    });

    this.documents.set('doc-del-004', {
      id: 'doc-del-004',
      projectId: proj1.id,
      customerId: cust1Profile.id,
      docTypeCode: 'technical_sld',
      docTypeName: 'Single Line Diagram (SLD) & Rooftop Layout',
      fileName: 'anil_gupta_roof_sld_v2.dwg.pdf',
      fileType: 'application/pdf',
      fileSize: '3.8 MB',
      fileSizeBytes: 3984588,
      storageKey: 'projects/RPS-2026-DEL-001/documents/technical_sld.pdf',
      storageUrl: '/api/documents/storage?docId=doc-del-004',
      category: 'technical_sld',
      verificationStatus: 'verified',
      uploadedAt: '2026-03-22T16:00:00Z',
      uploadedByUserId: emp1Profile.userId,
      uploadedByUserName: `${emp1Profile.firstName} ${emp1Profile.lastName}`,
      uploadedByUserRole: 'employee',
      verifiedAt: '2026-03-23T09:00:00Z',
      verifiedBy: `${admin1Profile.firstName} ${admin1Profile.lastName}`,
      verifiedByUserId: admin1Profile.userId,
      remarks: '5.5kW layout approved with 10x Tata Power 550W Mono PERC modules.',
      version: 2,
    });

    this.documents.set('doc-del-005', {
      id: 'doc-del-005',
      projectId: proj1.id,
      customerId: cust1Profile.id,
      docTypeCode: 'loan_sanction',
      docTypeName: 'Jan Samarth Loan Approval Sanction',
      fileName: 'anil_gupta_jan_samarth_sanction.pdf',
      fileType: 'application/pdf',
      fileSize: '2.1 MB',
      fileSizeBytes: 2202009,
      storageKey: 'projects/RPS-2026-DEL-001/documents/jan_samarth_sanction.pdf',
      storageUrl: '/api/documents/storage?docId=doc-del-005',
      category: 'agreement',
      verificationStatus: 'verified',
      uploadedAt: '2026-03-18T10:00:00Z',
      uploadedByUserId: emp1Profile.userId,
      uploadedByUserName: `${emp1Profile.firstName} ${emp1Profile.lastName}`,
      uploadedByUserRole: 'employee',
      verifiedAt: '2026-03-19T14:00:00Z',
      verifiedBy: `${admin1Profile.firstName} ${admin1Profile.lastName}`,
      verifiedByUserId: admin1Profile.userId,
      version: 1,
    });

    this.documents.set('doc-del-006', {
      id: 'doc-del-006',
      projectId: proj1.id,
      customerId: cust1Profile.id,
      docTypeCode: 'site_survey',
      docTypeName: 'Pre-Installation Site Survey & Shadow Analysis',
      fileName: 'anil_gupta_site_survey_report.pdf',
      fileType: 'application/pdf',
      fileSize: '4.5 MB',
      fileSizeBytes: 4718592,
      storageKey: 'projects/RPS-2026-DEL-001/documents/site_survey_report.pdf',
      storageUrl: '/api/documents/storage?docId=doc-del-006',
      category: 'site_docs',
      verificationStatus: 'under_review',
      uploadedAt: '2026-03-28T11:00:00Z',
      uploadedByUserId: emp1Profile.userId,
      uploadedByUserName: `${emp1Profile.firstName} ${emp1Profile.lastName}`,
      uploadedByUserRole: 'employee',
      remarks: 'Shadow profiling checked for South-facing terrace installation.',
      version: 1,
    });

    this.documents.set('doc-del-007', {
      id: 'doc-del-007',
      projectId: proj1.id,
      customerId: cust1Profile.id,
      docTypeCode: 'property_tax',
      docTypeName: 'Property Tax Receipt / Ownership Proof',
      fileName: 'anil_gupta_mcd_tax_old.pdf',
      fileType: 'application/pdf',
      fileSize: '1.1 MB',
      fileSizeBytes: 1153433,
      storageKey: 'projects/RPS-2026-DEL-001/documents/property_tax.pdf',
      storageUrl: '/api/documents/storage?docId=doc-del-007',
      category: 'site_docs',
      verificationStatus: 'rejected',
      uploadedAt: '2026-03-14T09:30:00Z',
      uploadedByUserId: emp1Profile.userId,
      uploadedByUserName: `${emp1Profile.firstName} ${emp1Profile.lastName}`,
      uploadedByUserRole: 'employee',
      verifiedAt: '2026-03-14T17:00:00Z',
      verifiedBy: `${admin1Profile.firstName} ${admin1Profile.lastName}`,
      verifiedByUserId: admin1Profile.userId,
      rejectionReason: 'Receipt submitted is for FY 2022-23 (expired). Please upload latest FY 2025-26 MCD tax receipt.',
      version: 1,
    });

    this.documents.set('doc-del-008', {
      id: 'doc-del-008',
      projectId: proj1.id,
      customerId: cust1Profile.id,
      docTypeCode: 'work_order',
      docTypeName: 'Signed EPC Work Order & Customer Agreement',
      fileName: 'anil_gupta_signed_epc_contract.pdf',
      fileType: 'application/pdf',
      fileSize: '2.8 MB',
      fileSizeBytes: 2936012,
      storageKey: 'projects/RPS-2026-DEL-001/documents/work_order_agreement.pdf',
      storageUrl: '/api/documents/storage?docId=doc-del-008',
      category: 'agreement',
      verificationStatus: 'uploaded',
      uploadedAt: '2026-03-30T15:00:00Z',
      uploadedByUserId: emp1Profile.userId,
      uploadedByUserName: `${emp1Profile.firstName} ${emp1Profile.lastName}`,
      uploadedByUserRole: 'employee',
      version: 1,
    });

    // Documents for Project 2 (B2B - Bangalore)
    this.documents.set('doc-blr-001', {
      id: 'doc-blr-001',
      projectId: proj2.id,
      customerId: cust2Profile.id,
      docTypeCode: 'gst_certificate',
      docTypeName: 'GST Registration Certificate',
      fileName: 'krishna_polymers_gst_cert.pdf',
      fileType: 'application/pdf',
      fileSize: '820 KB',
      fileSizeBytes: 839680,
      storageKey: 'projects/RPS-2026-BLR-002/documents/gst_cert.pdf',
      storageUrl: '/api/documents/storage?docId=doc-blr-001',
      category: 'identity',
      verificationStatus: 'verified',
      uploadedAt: '2026-03-21T16:25:00Z',
      uploadedByUserId: emp2Profile.userId,
      uploadedByUserName: `${emp2Profile.firstName} ${emp2Profile.lastName}`,
      uploadedByUserRole: 'employee',
      verifiedAt: '2026-03-22T10:00:00Z',
      verifiedBy: `${admin2Profile.firstName} ${admin2Profile.lastName}`,
      verifiedByUserId: admin2Profile.userId,
      remarks: 'GSTIN verified on GST portal.',
      version: 1,
    });

    this.documents.set('doc-blr-002', {
      id: 'doc-blr-002',
      projectId: proj2.id,
      customerId: cust2Profile.id,
      docTypeCode: 'technical_sld',
      docTypeName: 'Commercial Factory Roof Layout & Structural Stability',
      fileName: 'priya_commercial_layout.pdf',
      fileType: 'application/pdf',
      fileSize: '4.2 MB',
      fileSizeBytes: 4404019,
      storageKey: 'projects/RPS-2026-BLR-002/documents/commercial_layout.pdf',
      storageUrl: '/api/documents/storage?docId=doc-blr-002',
      category: 'technical_sld',
      verificationStatus: 'verified',
      uploadedAt: '2026-03-21T16:20:00Z',
      uploadedByUserId: emp2Profile.userId,
      uploadedByUserName: `${emp2Profile.firstName} ${emp2Profile.lastName}`,
      uploadedByUserRole: 'employee',
      verifiedAt: '2026-03-22T10:30:00Z',
      verifiedBy: `${admin2Profile.firstName} ${admin2Profile.lastName}`,
      verifiedByUserId: admin2Profile.userId,
      version: 1,
    });

    this.documents.set('doc-blr-003', {
      id: 'doc-blr-003',
      projectId: proj2.id,
      customerId: cust2Profile.id,
      docTypeCode: 'net_metering_noc',
      docTypeName: 'BESCOM High Tension Net-Metering Feasibility & TFR',
      fileName: 'bescom_tfr_approval.pdf',
      fileType: 'application/pdf',
      fileSize: '1.9 MB',
      fileSizeBytes: 1992294,
      storageKey: 'projects/RPS-2026-BLR-002/documents/bescom_tfr.pdf',
      storageUrl: '/api/documents/storage?docId=doc-blr-003',
      category: 'site_docs',
      verificationStatus: 'verified',
      uploadedAt: '2026-03-24T12:00:00Z',
      uploadedByUserId: emp2Profile.userId,
      uploadedByUserName: `${emp2Profile.firstName} ${emp2Profile.lastName}`,
      uploadedByUserRole: 'employee',
      verifiedAt: '2026-03-25T11:00:00Z',
      verifiedBy: `${admin2Profile.firstName} ${admin2Profile.lastName}`,
      verifiedByUserId: admin2Profile.userId,
      version: 1,
    });

    this.documents.set('doc-blr-004', {
      id: 'doc-blr-004',
      projectId: proj2.id,
      customerId: cust2Profile.id,
      docTypeCode: 'plant_commissioning',
      docTypeName: 'Plant Joint Inspection & Commissioning Certificate',
      fileName: 'krishna_polymers_commissioning_cert.pdf',
      fileType: 'application/pdf',
      fileSize: '2.4 MB',
      fileSizeBytes: 2516582,
      storageKey: 'projects/RPS-2026-BLR-002/documents/commissioning_cert.pdf',
      storageUrl: '/api/documents/storage?docId=doc-blr-004',
      category: 'commissioning',
      verificationStatus: 'verified',
      uploadedAt: '2026-03-29T16:00:00Z',
      uploadedByUserId: emp2Profile.userId,
      uploadedByUserName: `${emp2Profile.firstName} ${emp2Profile.lastName}`,
      uploadedByUserRole: 'employee',
      verifiedAt: '2026-03-30T10:00:00Z',
      verifiedBy: `${admin2Profile.firstName} ${admin2Profile.lastName}`,
      verifiedByUserId: admin2Profile.userId,
      version: 1,
    });

    this.documents.set('doc-blr-005', {
      id: 'doc-blr-005',
      projectId: proj2.id,
      customerId: cust2Profile.id,
      docTypeCode: 'warranty_certificate',
      docTypeName: 'Solar Inverter & PV Module Manufacturer Warranty Cards',
      fileName: 'krishna_polymers_warranty_cards.pdf',
      fileType: 'application/pdf',
      fileSize: '3.1 MB',
      fileSizeBytes: 3250585,
      storageKey: 'projects/RPS-2026-BLR-002/documents/warranty_cards.pdf',
      storageUrl: '/api/documents/storage?docId=doc-blr-005',
      category: 'warranty',
      verificationStatus: 'under_review',
      uploadedAt: '2026-03-30T17:00:00Z',
      uploadedByUserId: emp2Profile.userId,
      uploadedByUserName: `${emp2Profile.firstName} ${emp2Profile.lastName}`,
      uploadedByUserRole: 'employee',
      remarks: 'Warranty cards submitted for 25kW Growatt inverters and Vikram Solar modules.',
      version: 1,
    });

    // 12. Installation Records
    // 12. Installation Records (with 9 Canonical Stages)
    this.installations.set('inst-del-rec', {
      id: 'inst-del-rec',
      projectId: proj1.id,
      customerId: cust1Profile.id,
      leadTechnicianId: emp1Profile.id,
      leadTechnicianName: `${emp1Profile.firstName} ${emp1Profile.lastName}`,
      assignedTeam: 'North Installation Alpha Team',
      status: 'in_progress',
      tiltAngle: 28,
      panelCount: 10,
      panelModel: 'Tata Power 550W Mono PERC Half-Cut Modules',
      inverterModel: 'Growatt 5kW Dual-MPPT On-Grid Inverter',
      inverterSerial: 'GW-5K-2026-88190',
      structureType: 'Elevated GI HDG Standard (3.5m clearance)',
      scheduledDate: '2026-03-24',
      safetyAuditPassed: true,
      sitePhotos: ['/assets/sites/del-001-roof.jpg', '/assets/sites/del-001-mms.jpg'],
      installationProgress: 67, // 6 of 9 stages completed
      stages: [
        {
          stageKey: 'structure_supply',
          stageName: 'Structure Supply',
          sequenceOrder: 1,
          status: 'completed',
          plannedDate: '2026-03-20',
          actualDate: '2026-03-20',
          assignedPerson: 'Rahul Sharma',
          assignedTeam: 'North Logistics',
          remarks: 'Heavy-duty HDG elevated structure delivered and unloaded on terrace.',
          photos: ['/photos/mms-delivery-del.jpg'],
        },
        {
          stageKey: 'structure_installation',
          stageName: 'Structure Installation',
          sequenceOrder: 2,
          status: 'completed',
          plannedDate: '2026-03-22',
          actualDate: '2026-03-22',
          assignedPerson: 'Mohan Kumar',
          assignedTeam: 'Civil & Mounting Crew',
          remarks: 'Civil grouting and torque-tightening completed with 28° South tilt.',
          photos: ['/photos/mms-installed-del.jpg'],
        },
        {
          stageKey: 'wiring_earthing_supply',
          stageName: 'Wiring & Earthing Supply',
          sequenceOrder: 3,
          status: 'completed',
          plannedDate: '2026-03-23',
          actualDate: '2026-03-23',
          assignedPerson: 'Rahul Sharma',
          assignedTeam: 'North Logistics',
          remarks: 'Polycab 4 sq.mm solar DC cable and copper earthing electrodes delivered.',
        },
        {
          stageKey: 'wiring_earthing_installation',
          stageName: 'Wiring & Earthing Installation',
          sequenceOrder: 4,
          status: 'completed',
          plannedDate: '2026-03-24',
          actualDate: '2026-03-24',
          assignedPerson: 'Sanjay Electrician',
          assignedTeam: 'Electrical QA',
          remarks: '3 separate earthing pits (DC, AC, Lightning Arrester) tested < 2 Ohms.',
          photos: ['/photos/earthing-pits-del.jpg'],
        },
        {
          stageKey: 'system_supply',
          stageName: 'System Supply',
          sequenceOrder: 5,
          status: 'completed',
          plannedDate: '2026-03-25',
          actualDate: '2026-03-25',
          assignedPerson: 'Rahul Sharma',
          assignedTeam: 'North Logistics',
          remarks: '10x Tata Power 550W modules and Growatt 5kW inverter received at site.',
        },
        {
          stageKey: 'system_installation',
          stageName: 'System Installation',
          sequenceOrder: 6,
          status: 'completed',
          plannedDate: '2026-03-26',
          actualDate: '2026-03-26',
          assignedPerson: 'Sanjay Electrician',
          assignedTeam: 'North Installation Alpha Team',
          remarks: 'Module mounting, MC4 crimping, and inverter AC/DC termination completed.',
          photos: ['/photos/system-mounted-del.jpg'],
        },
        {
          stageKey: 'net_meter_installation',
          stageName: 'Net Meter Installation',
          sequenceOrder: 7,
          status: 'in_progress',
          plannedDate: '2026-04-02',
          assignedPerson: 'Rahul Sharma',
          assignedTeam: 'BSES Liaisoning',
          remarks: 'DISCOM bi-directional meter testing scheduled at BSES lab.',
        },
        {
          stageKey: 'inspection',
          stageName: 'Inspection',
          sequenceOrder: 8,
          status: 'pending',
          plannedDate: '2026-04-05',
          assignedPerson: 'Rajesh Verma (Admin)',
          assignedTeam: 'QA & Safety Audit',
          remarks: 'Joint technical inspection with DISCOM AE.',
        },
        {
          stageKey: 'warranty',
          stageName: 'Warranty',
          sequenceOrder: 9,
          status: 'pending',
          plannedDate: '2026-04-08',
          assignedPerson: 'Rahul Sharma',
          assignedTeam: 'Customer Success',
          remarks: 'Final commissioning pack & 25-yr panel warranty handover.',
        },
      ],
    });

    this.installations.set('inst-blr-rec', {
      id: 'inst-blr-rec',
      projectId: proj2.id,
      customerId: cust2Profile.id,
      leadTechnicianId: emp2Profile.id,
      leadTechnicianName: `${emp2Profile.firstName} ${emp2Profile.lastName}`,
      assignedTeam: 'South Industrial EPC Unit',
      status: 'completed',
      tiltAngle: 15,
      panelCount: 46,
      panelModel: 'Waaree 545W Bifacial TOPCon Modules',
      inverterModel: 'Sungrow 25kW String Inverter with IP66 Protection',
      inverterSerial: 'SG-25CX-2026-99014',
      structureType: 'Industrial High-Wind Reinforced Ballasted MMS',
      scheduledDate: '2026-03-22',
      completionDate: '2026-03-28',
      safetyAuditPassed: true,
      sitePhotos: ['/assets/sites/blr-002-plant.jpg', '/assets/sites/blr-002-inverter.jpg'],
      installationProgress: 100, // 9 of 9 completed
      stages: [
        {
          stageKey: 'structure_supply',
          stageName: 'Structure Supply',
          sequenceOrder: 1,
          status: 'completed',
          plannedDate: '2026-03-20',
          actualDate: '2026-03-20',
          assignedPerson: 'Vikram Nair',
          assignedTeam: 'South Industrial Logistics',
        },
        {
          stageKey: 'structure_installation',
          stageName: 'Structure Installation',
          sequenceOrder: 2,
          status: 'completed',
          plannedDate: '2026-03-21',
          actualDate: '2026-03-21',
          assignedPerson: 'Karthik Gowda',
          assignedTeam: 'South Mounting Crew',
        },
        {
          stageKey: 'wiring_earthing_supply',
          stageName: 'Wiring & Earthing Supply',
          sequenceOrder: 3,
          status: 'completed',
          plannedDate: '2026-03-22',
          actualDate: '2026-03-22',
          assignedPerson: 'Vikram Nair',
          assignedTeam: 'South Industrial Logistics',
        },
        {
          stageKey: 'wiring_earthing_installation',
          stageName: 'Wiring & Earthing Installation',
          sequenceOrder: 4,
          status: 'completed',
          plannedDate: '2026-03-23',
          actualDate: '2026-03-23',
          assignedPerson: 'Prakash Rao',
          assignedTeam: 'HT Electrical Unit',
        },
        {
          stageKey: 'system_supply',
          stageName: 'System Supply',
          sequenceOrder: 5,
          status: 'completed',
          plannedDate: '2026-03-24',
          actualDate: '2026-03-24',
          assignedPerson: 'Vikram Nair',
          assignedTeam: 'South Industrial Logistics',
        },
        {
          stageKey: 'system_installation',
          stageName: 'System Installation',
          sequenceOrder: 6,
          status: 'completed',
          plannedDate: '2026-03-25',
          actualDate: '2026-03-25',
          assignedPerson: 'Prakash Rao',
          assignedTeam: 'South Industrial EPC Unit',
        },
        {
          stageKey: 'net_meter_installation',
          stageName: 'Net Meter Installation',
          sequenceOrder: 7,
          status: 'completed',
          plannedDate: '2026-03-26',
          actualDate: '2026-03-26',
          assignedPerson: 'Vikram Nair',
          assignedTeam: 'BESCOM Liaisoning',
        },
        {
          stageKey: 'inspection',
          stageName: 'Inspection',
          sequenceOrder: 8,
          status: 'completed',
          plannedDate: '2026-03-27',
          actualDate: '2026-03-27',
          assignedPerson: 'Suresh Menon (Admin)',
          assignedTeam: 'CEIG & Safety Compliance',
        },
        {
          stageKey: 'warranty',
          stageName: 'Warranty',
          sequenceOrder: 9,
          status: 'completed',
          plannedDate: '2026-03-28',
          actualDate: '2026-03-28',
          assignedPerson: 'Vikram Nair',
          assignedTeam: 'Customer Success',
          remarks: '25kW plant synchronised and handed over with warranty certificates.',
        },
      ],
    });

    // 13. Subsidies (Completely decoupled from payments & projects)
    this.subsidies.set('sub-del-rec', {
      id: 'sub-del-rec',
      projectId: proj1.id,
      customerId: cust1Profile.id,
      solarCapacityKw: 5.5,
      subsidyApplicable: true,
      schemeName: 'PM Surya Ghar: Muft Bijli Yojana (National Solar Portal)',
      applicationNumber: 'PMSGY-DL-2026-98210',
      applicationDate: '2026-03-18',
      subsidyAmount: 78000,
      inspectionStatus: 'passed',
      subsidyStatus: 'under_process',
      redemptionDate: undefined,
      dbtAccountNumber: 'XXXX-XXXX-4412 (SBI Mayur Vihar)',
      discomConsumerNo: 'BSES-DL-98231',
      inspectionDate: '2026-03-27',
      inspectorName: 'BSES Solar Inspector A.K. Dixit',
      remarks: 'Joint Inspection Report (JIR) verified and uploaded to National Portal. DBT disbursement in queue.',
      createdAt: '2026-03-18T10:00:00Z',
      updatedAt: '2026-03-27T16:00:00Z',
    });

    this.subsidies.set('sub-blr-rec', {
      id: 'sub-blr-rec',
      projectId: proj2.id,
      customerId: cust2Profile.id,
      solarCapacityKw: 25.0,
      subsidyApplicable: false,
      schemeName: 'Commercial & Industrial Solar (Accelerated Depreciation Route)',
      applicationNumber: 'BESCOM-HT-SOLAR-2026-440',
      applicationDate: '2026-03-20',
      subsidyAmount: 0,
      inspectionStatus: 'passed',
      subsidyStatus: 'not_applied',
      redemptionDate: undefined,
      discomConsumerNo: 'BESCOM-KA-77210',
      inspectionDate: '2026-03-27',
      inspectorName: 'BESCOM HT Executive Engineer',
      remarks: 'Commercial B2B rooftop plant not claiming residential DBT subsidy; claiming 40% Accelerated Depreciation tax benefit.',
      createdAt: '2026-03-20T11:00:00Z',
      updatedAt: '2026-03-27T17:00:00Z',
    });

    // 14. Invoices
    this.invoices.set('inv-del-001', {
      id: 'inv-del-001',
      invoiceNumber: 'RPS-INV-2026-0044',
      projectId: proj1.id,
      customerId: cust1Profile.id,
      issueDate: '2026-03-15',
      dueDate: '2026-04-15',
      baseAmount: 281198,
      taxGstAmount: 38802,
      totalAmount: 320000,
      status: 'partially_paid',
      paymentMode: 'Jan Samarth Loan + Customer Advance',
      lineItems: [
        {
          description: '5.5 kW On-Grid Rooftop Solar EPC Supply (Tier-1 Modules, Inverter, BOS)',
          capacityKw: 5.5,
          rate: 45000,
          total: 247500,
        },
        {
          description: 'Module Mounting Structure (GI Elevated) & Civil Foundations',
          rate: 22000,
          total: 22000,
        },
        {
          description: 'DISCOM Net-Metering & CEIG Compliance Liaisoning Charges',
          rate: 11698,
          total: 11698,
        },
      ],
    });

    this.invoices.set('inv-blr-002', {
      id: 'inv-blr-002',
      invoiceNumber: 'RPS-INV-2026-0038',
      projectId: proj2.id,
      customerId: cust2Profile.id,
      issueDate: '2026-03-20',
      dueDate: '2026-04-05',
      baseAmount: 1228813,
      taxGstAmount: 221187,
      totalAmount: 1450000,
      status: 'paid',
      paymentMode: 'Corporate RTGS Settlement',
      lineItems: [
        {
          description: '25 kW Commercial Hybrid Solar PV Plant Turnkey EPC Supply',
          capacityKw: 25,
          rate: 42000,
          total: 1050000,
        },
        {
          description: 'High-Tension (HT) Switchgear, Transformer & Protection Setup',
          rate: 128813,
          total: 128813,
        },
        {
          description: 'BESCOM Net-Meter Synchronization & Industrial CEIG Certification',
          rate: 50000,
          total: 50000,
        },
      ],
    });

    // 15. Warranties
    this.warranties.set('war-del-001', {
      id: 'war-del-001',
      certificateNumber: 'RPS-WAR-2026-DEL-001',
      projectId: proj1.id,
      customerId: cust1Profile.id,
      panelWarrantyYears: 25,
      inverterWarrantyYears: 5,
      workmanshipWarrantyYears: 5,
      startDate: '2026-03-25',
      endDate: '2051-03-25',
      panelManufacturer: 'Tata Power Solar Systems Ltd (Linear Degradation Guarantee)',
      inverterManufacturer: 'Growatt New Energy Co., Ltd.',
      status: 'active',
    });

    this.warranties.set('war-blr-002', {
      id: 'war-blr-002',
      certificateNumber: 'RPS-WAR-2026-BLR-002',
      projectId: proj2.id,
      customerId: cust2Profile.id,
      panelWarrantyYears: 25,
      inverterWarrantyYears: 10,
      workmanshipWarrantyYears: 5,
      startDate: '2026-03-28',
      endDate: '2051-03-28',
      panelManufacturer: 'Waaree Energies Ltd (Tier-1 TOPCon 30-Year Performance)',
      inverterManufacturer: 'Sungrow Power Supply Co., Ltd.',
      status: 'active',
    });

    // 16. Initial Notifications for all 13 Triggers
    const seedNotifications: Omit<NotificationItem, 'id' | 'createdAt'>[] = [
      {
        recipientRole: 'employee',
        recipientUserId: emp1User.id,
        type: 'customer_assigned',
        title: 'Customer Assigned: Rajesh Verma',
        message: 'Customer Rajesh Verma (5.5 kW Residential, West Delhi) has been assigned to your sales portfolio.',
        entityType: 'customer',
        entityId: 'cust-b2c-01',
        link: '/customers',
        isRead: false,
      },
      {
        recipientRole: 'employee',
        recipientUserId: emp1User.id,
        type: 'project_assigned',
        title: 'Project Assigned: RPS-2026-DEL-001',
        message: '5.5 kW Residential Solar Project for Rajesh Verma assigned to Project Executive Rahul Sharma.',
        entityType: 'project',
        entityId: 'proj-rps-2026-01',
        link: '/projects/proj-rps-2026-01',
        isRead: false,
      },
      {
        recipientRole: 'all',
        type: 'project_stage_updated',
        title: 'Project Stage Updated: RPS-2026-DEL-001',
        message: 'Structure Installation moved from In Progress → Completed by Manish.',
        entityType: 'project',
        entityId: 'proj-rps-2026-01',
        link: '/projects/proj-rps-2026-01',
        isRead: false,
      },
      {
        recipientRole: 'admin',
        type: 'document_uploaded',
        title: 'Document Uploaded: Electricity Bill',
        message: 'Electricity Bill for Anil Gupta (PMSGY-2026-03) uploaded and awaiting verification.',
        entityType: 'document',
        entityId: 'doc-el-03',
        link: '/documents',
        isRead: false,
      },
      {
        recipientRole: 'employee',
        recipientUserId: emp2User.id,
        type: 'document_rejected',
        title: 'Document Rejected: Site Survey Drawing',
        message: 'Site Survey Drawing for Vikas Agro Cold Storage was rejected: Shadow analysis diagram missing.',
        entityType: 'document',
        entityId: 'doc-cad-02',
        link: '/documents',
        isRead: true,
      },
      {
        recipientRole: 'all',
        type: 'payment_received',
        title: 'Payment Received: ₹1,50,000',
        message: 'Milestone 2 payment received from GreenTech Warehousing via RTGS (Ref: CMS-RTGS-992104).',
        entityType: 'payment',
        entityId: 'pay-proj-02',
        link: '/payments',
        isRead: false,
      },
      {
        recipientRole: 'admin',
        type: 'payment_overdue',
        title: 'Payment Milestone Overdue: Meera Patel',
        message: 'Milestone 3 (Structure Erection) is 5 days overdue (₹60,000) for Project RPS-2026-BLR-003.',
        entityType: 'payment',
        entityId: 'pay-proj-03',
        link: '/payments',
        isRead: false,
      },
      {
        recipientRole: 'employee',
        type: 'installation_scheduled',
        title: 'Installation Scheduled: Wiring & Earthing',
        message: 'Wiring & Earthing Installation scheduled for Project RPS-2026-DEL-001 on 10 Oct 2026.',
        entityType: 'installation',
        entityId: 'inst-rps-2026-01',
        link: '/installation',
        isRead: true,
      },
      {
        recipientRole: 'all',
        type: 'installation_completed',
        title: 'Installation Completed: Structure Supply & Erection',
        message: 'Structure Supply and Erection completed and QA verified for 5.5 kW site at DL-West.',
        entityType: 'installation',
        entityId: 'inst-rps-2026-01',
        link: '/installation',
        isRead: false,
      },
      {
        recipientRole: 'admin',
        type: 'inspection_pending',
        title: 'DISCOM Net Meter Inspection Pending',
        message: 'Site inspection pending with BSES Rajdhani Power Ltd for 5.5 kW rooftop synchronization.',
        entityType: 'installation',
        entityId: 'inst-rps-2026-01',
        link: '/installation',
        isRead: false,
      },
      {
        recipientRole: 'all',
        type: 'subsidy_updated',
        title: 'PM Surya Ghar Subsidy Approved: ₹78,000',
        message: 'Central DBT subsidy approved on National Portal for Customer Rajesh Verma (App: PMSGY-DL-88210).',
        entityType: 'subsidy',
        entityId: 'sub-proj-01',
        link: '/subsidies',
        isRead: false,
      },
      {
        recipientRole: 'all',
        type: 'warranty_issued',
        title: '25-Year Performance Warranty Issued',
        message: 'Official OEM Warranty WAR-2026-001 issued for 100 kW Waaree Tier-1 TOPCon Solar Array.',
        entityType: 'warranty',
        entityId: 'war-proj-02',
        link: '/projects/proj-rps-2026-02',
        isRead: true,
      },
      {
        recipientRole: 'all',
        type: 'invoice_uploaded',
        title: 'Tax Invoice Uploaded: INV-2026-001',
        message: 'GST Tax Invoice INV-2026-001 (₹2,47,500) generated and uploaded for Project RPS-2026-DEL-001.',
        entityType: 'invoice',
        entityId: 'inv-proj-01',
        link: '/payments',
        isRead: false,
      },
    ];

    seedNotifications.forEach((n, idx) => {
      const id = `notif-seed-${idx + 1}`;
      this.notifications.set(id, {
        ...n,
        id,
        createdAt: new Date(Date.now() - idx * 3600000).toISOString(),
      });
    });

    // 17. Comprehensive Seed Immutable Audit Trail with Previous/New Value Diffs
    const seedAuditLogs: AuditLogEntry[] = [
      {
        id: 'aud-001',
        actorUserId: emp1User.id,
        actorName: 'Manish Kumar',
        actorEmail: 'manish.tech@rpsolar.com',
        actorUserType: 'employee',
        actorRole: 'Site Operations Lead',
        actorIp: '192.168.1.45',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        action: 'UPDATE_PROJECT_STAGE',
        module: 'projects',
        entityTable: 'projects',
        entityId: 'proj-rps-2026-01',
        recordIdentifier: 'Project RP1023 (RPS-2026-DEL-001)',
        previousValue: 'Structure Installation: In Progress',
        newValue: 'Structure Installation: Completed',
        details: 'Manish updated Project RP1023 — Structure Installation changed from In Progress → Completed after torque checking & structural load QA sign-off.',
        status: 'SUCCESS',
        timestamp: '05 Oct 2026, 4:35 PM',
        createdAt: '2026-10-05T16:35:00Z',
      },
      {
        id: 'aud-002',
        actorUserId: admin1User.id,
        actorName: 'Rajesh Verma',
        actorEmail: admin1User.email,
        actorUserType: 'admin',
        actorRole: 'Regional Admin (North)',
        actorIp: '192.168.1.10',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        action: 'ASSIGN_CUSTOMER',
        module: 'customers',
        entityTable: 'customers',
        entityId: 'cust-b2c-01',
        recordIdentifier: 'Customer Rajesh Verma (CUST-DEL-001)',
        previousValue: 'Assigned Employee: Unassigned',
        newValue: 'Assigned Employee: Rahul Sharma (EMP-DEL-010)',
        details: 'Admin Rajesh Verma assigned new 5.5 kW residential solar lead in Janakpuri to Project Executive Rahul Sharma.',
        status: 'SUCCESS',
        timestamp: '05 Oct 2026, 2:15 PM',
        createdAt: '2026-10-05T14:15:00Z',
      },
      {
        id: 'aud-003',
        actorUserId: emp1User.id,
        actorName: 'Rahul Sharma',
        actorEmail: emp1User.email,
        actorUserType: 'employee',
        actorRole: 'Senior Project Executive',
        actorIp: '192.168.1.22',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        action: 'VERIFY_DOCUMENT',
        module: 'documents',
        entityTable: 'documents',
        entityId: 'doc-el-01',
        recordIdentifier: 'Document DOC-ELEC-001 (Electricity Bill)',
        previousValue: 'Verification Status: Under Review',
        newValue: 'Verification Status: Verified',
        details: 'Sanctioned load (7 kW) and BSES consumer CA number cross-verified with DISCOM database.',
        status: 'SUCCESS',
        timestamp: '05 Oct 2026, 11:30 AM',
        createdAt: '2026-10-05T11:30:00Z',
      },
      {
        id: 'aud-004',
        actorUserId: admin2User.id,
        actorName: 'Suresh Menon',
        actorEmail: admin2User.email,
        actorUserType: 'admin',
        actorRole: 'Commercial Project Admin (South)',
        actorIp: '192.168.1.18',
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64)',
        action: 'RECORD_PAYMENT',
        module: 'payments',
        entityTable: 'payments',
        entityId: 'pay-proj-02',
        recordIdentifier: 'Payment TXN-CMS-992104 (GreenTech 100kW)',
        previousValue: 'Payment Status: Partially Paid (₹15,00,000 / ₹42,00,000)',
        newValue: 'Payment Status: Partially Paid (₹29,50,000 / ₹42,00,000)',
        details: 'Milestone 2 payment of ₹14,50,000 received via RTGS from GreenTech Warehousing Pvt Ltd.',
        status: 'SUCCESS',
        timestamp: '04 Oct 2026, 5:40 PM',
        createdAt: '2026-10-04T17:40:00Z',
      },
      {
        id: 'aud-005',
        actorUserId: admin1User.id,
        actorName: 'Rajesh Verma',
        actorEmail: admin1User.email,
        actorUserType: 'admin',
        actorRole: 'Regional Admin (North)',
        actorIp: '192.168.1.10',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        action: 'REJECT_DOCUMENT',
        module: 'documents',
        entityTable: 'documents',
        entityId: 'doc-cad-02',
        recordIdentifier: 'Document DOC-CAD-002 (Site Survey CAD)',
        previousValue: 'Verification Status: Uploaded',
        newValue: 'Verification Status: Rejected (Missing 3D shadow analysis)',
        details: 'Site layout drawing rejected. Requested updated shadow analysis for RCC parapet wall obstruction.',
        status: 'SUCCESS',
        timestamp: '04 Oct 2026, 3:10 PM',
        createdAt: '2026-10-04T15:10:00Z',
      },
      {
        id: 'aud-006',
        actorUserId: emp1User.id,
        actorName: 'Rahul Sharma',
        actorEmail: emp1User.email,
        actorUserType: 'employee',
        actorRole: 'Senior Project Executive',
        actorIp: '192.168.1.22',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        action: 'UPDATE_SUBSIDY_STATUS',
        module: 'subsidies',
        entityTable: 'subsidies',
        entityId: 'sub-proj-01',
        recordIdentifier: 'Subsidy PMSGY-DL-88210 (Rajesh Verma)',
        previousValue: 'Subsidy Status: Applied',
        newValue: 'Subsidy Status: Approved (₹78,000 Central DBT)',
        details: 'National Portal PM Surya Ghar validated net meter certificate. Central subsidy sanctioned for direct DBT transfer.',
        status: 'SUCCESS',
        timestamp: '04 Oct 2026, 1:20 PM',
        createdAt: '2026-10-04T13:20:00Z',
      },
      {
        id: 'aud-007',
        actorUserId: superAdminUser.id,
        actorName: 'Super Admin',
        actorEmail: superAdminUser.email,
        actorUserType: 'super_admin',
        actorRole: 'Managing Director & Enterprise Super Admin',
        actorIp: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        action: 'CREATE_ADMIN_USER',
        module: 'users',
        entityTable: 'users',
        entityId: admin2User.id,
        recordIdentifier: 'User Account Suresh Menon (admin.south@rpsolar.com)',
        previousValue: 'Account Status: Non-existent',
        newValue: 'Account Status: Active (Admin - South Region)',
        details: 'Created and delegated Commercial Projects administrative authority for South Region to Suresh Menon.',
        status: 'SUCCESS',
        timestamp: '03 Oct 2026, 10:00 AM',
        createdAt: '2026-10-03T10:00:00Z',
      },
      {
        id: 'aud-008',
        actorUserId: emp1User.id,
        actorName: 'Vikram Singh',
        actorEmail: 'vikram.qa@rpsolar.com',
        actorUserType: 'employee',
        actorRole: 'QA & Commissioning Engineer',
        actorIp: '192.168.1.33',
        userAgent: 'Mozilla/5.0 (Android 14; Mobile)',
        action: 'SCHEDULE_INSTALLATION',
        module: 'installations',
        entityTable: 'installations',
        entityId: 'inst-rps-2026-01',
        recordIdentifier: 'Installation STAGE-04 (Wiring & Earthing)',
        previousValue: 'Installation Status: Pending Material',
        newValue: 'Installation Status: Scheduled (Planned: 10 Oct 2026)',
        details: 'Dispatched 16 sq mm 4-core copper solar cable & 3x copper chemical earthing rods to site.',
        status: 'SUCCESS',
        timestamp: '02 Oct 2026, 4:10 PM',
        createdAt: '2026-10-02T16:10:00Z',
      },
      {
        id: 'aud-009',
        actorUserId: admin1User.id,
        actorName: 'Rajesh Verma',
        actorEmail: admin1User.email,
        actorUserType: 'admin',
        actorRole: 'Regional Admin (North)',
        actorIp: '192.168.1.10',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        action: 'ISSUE_WARRANTY',
        module: 'warranties',
        entityTable: 'warranties',
        entityId: 'war-proj-02',
        recordIdentifier: 'Warranty WAR-2026-001 (Waaree Tier-1 TOPCon)',
        previousValue: 'Warranty Status: Pending Issuance',
        newValue: 'Warranty Status: Active (25 Years Performance)',
        details: 'Generated digital OEM warranty certificate with manufacturer serial numbers and flash test reports.',
        status: 'SUCCESS',
        timestamp: '02 Oct 2026, 2:00 PM',
        createdAt: '2026-10-02T14:00:00Z',
      },
      {
        id: 'aud-010',
        actorUserId: superAdminUser.id,
        actorName: 'Super Admin',
        actorEmail: superAdminUser.email,
        actorUserType: 'super_admin',
        actorRole: 'Managing Director & Enterprise Super Admin',
        actorIp: '127.0.0.1',
        userAgent: 'System Seed Engine',
        action: 'SYSTEM_BOOTSTRAP',
        module: 'system',
        entityTable: 'system',
        entityId: 'root',
        recordIdentifier: 'System Core Engine',
        previousValue: 'Database: Empty',
        newValue: 'Database: Initialized & Verified',
        details: 'Bootstrapped multi-tier organization and customer hierarchy with complete 360 project assets, IAM permissions, and tamper-proof ledger.',
        status: 'SUCCESS',
        timestamp: '01 Oct 2026, 9:00 AM',
        createdAt: '2026-10-01T09:00:00Z',
      },
    ];

    seedAuditLogs.forEach((log) => {
      this.auditLogs.push(log);
    });

    // 18. Build high-performance secondary index lookups
    this.rebuildIndexes();
  }

  public getEmployeePerformance(employeeProfileId: string): EmployeePerformanceStats | null {
    const emp = this.employees.get(employeeProfileId);
    if (!emp) return null;

    const admin = this.admins.get(emp.reportingAdminId);
    const assignedCusts = Array.from(this.customers.values()).filter(
      (c) => c.assignedEmployeeId === employeeProfileId
    );

    const b2bCount = assignedCusts.filter(
      (c) => c.customerType === 'commercial' || c.customerType === 'industrial'
    ).length;
    const b2cCount = assignedCusts.filter(
      (c) => c.customerType === 'residential' || c.customerType === 'institutional'
    ).length;

    const assignedProjs = Array.from(this.projects.values()).filter(
      (p) => p.assignedEngineerId === employeeProfileId || assignedCusts.some((c) => c.id === p.customerId)
    );

    const activeProjs = assignedProjs.filter((p) => p.status !== 'completed' && p.status !== 'cancelled').length;
    const completedProjs = assignedProjs.filter((p) => p.status === 'completed').length;
    const totalKw = assignedProjs.reduce((acc, p) => acc + (p.capacityKw || 0), 0);

    const assignedProjIds = new Set(assignedProjs.map((p) => p.id));
    const assignedPayments = Array.from(this.payments.values()).filter((pay) => assignedProjIds.has(pay.projectId));

    const totalCollected = assignedPayments.reduce((acc, p) => acc + (p.paidAmount || 0), 0);
    const totalPending = assignedPayments.reduce((acc, p) => acc + (p.balanceAmount || 0), 0);

    const totalProjects = assignedProjs.length;
    const completionRate = totalProjects > 0 ? Math.round((completedProjs / totalProjects) * 100) : 0;

    return {
      employeeId: emp.id,
      employeeCode: emp.employeeCode,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      department: emp.department,
      designation: emp.designation,
      assignedRegion: emp.assignedRegion,
      reportingAdminName: admin ? `${admin.firstName} ${admin.lastName} (${admin.branchRegion})` : 'Unassigned',
      totalCustomers: assignedCusts.length,
      b2bCustomers: b2bCount,
      b2cCustomers: b2cCount,
      activeProjects: activeProjs,
      completedProjects: completedProjs,
      totalSolarCapacityKw: totalKw,
      pendingTasks: activeProjs * 2 + 1,
      totalPaymentCollections: totalCollected,
      pendingPaymentCollections: totalPending,
      completionRatePercent: completionRate,
    };
  }

  public updateProjectStage(
    projectId: string,
    stageKey: string,
    updates: {
      status: StageStatus;
      completionDate?: string | null;
      remarks?: string;
      document?: { id: string; name: string; url?: string; uploadedAt: string };
    },
    actor: { userId: string; name: string; role: string }
  ): { success: boolean; project?: Project; error?: string } {
    const project = this.projects.get(projectId);
    if (!project) return { success: false, error: 'Project not found' };

    if (!project.stages || project.stages.length === 0) {
      project.stages = initializeProjectStages();
    }
    if (!project.stageHistory) {
      project.stageHistory = [];
    }

    const stageIndex = project.stages.findIndex((s) => s.stageKey === stageKey);
    if (stageIndex === -1) return { success: false, error: `Stage '${stageKey}' not recognized in operational catalog` };

    const targetStage = project.stages[stageIndex];
    const prevStatus = targetStage.status;
    const newStatus = updates.status || prevStatus;

    // Apply updates
    targetStage.status = newStatus;
    if (updates.completionDate !== undefined) {
      targetStage.completionDate = updates.completionDate;
    } else if (newStatus === 'completed' && !targetStage.completionDate) {
      targetStage.completionDate = new Date().toISOString().split('T')[0];
    }
    if (updates.remarks !== undefined) {
      targetStage.remarks = updates.remarks;
    }
    if (updates.document) {
      if (!targetStage.documents) targetStage.documents = [];
      targetStage.documents.push(updates.document);
    }
    targetStage.updatedAt = new Date().toISOString();
    targetStage.updatedBy = actor;

    // Permanent History Audit Entry (Immutable)
    const historyEntry = createStageHistoryRecord({
      projectId,
      stageKey,
      stageName: targetStage.stageName,
      previousStatus: prevStatus,
      newStatus,
      changedByUserId: actor.userId,
      changedByUserName: actor.name,
      changedByUserRole: actor.role,
      remarks: updates.remarks || `Stage status changed from '${prevStatus}' to '${newStatus}'`,
    });
    project.stageHistory.push(historyEntry);

    // Recompute currentStage & status
    const inProgressStages = project.stages.filter((s) => s.status === 'in_progress');
    if (inProgressStages.length > 0) {
      project.currentStage = inProgressStages[0].stageName;
      project.status = 'in_progress';
    } else {
      const allDone = project.stages.every((s) => s.status === 'completed' || s.status === 'not_applicable');
      if (allDone) {
        project.status = 'completed';
        project.currentStage = 'Completed & Subsidy Settled';
        project.actualCommissioningDate = new Date().toISOString().split('T')[0];
      }
    }

    return { success: true, project };
  }

  public getProject360(projectId: string) {
    const project = this.projects.get(projectId);
    if (!project) return null;

    const customer = this.customers.get(project.customerId);
    const org = project.b2bOrganizationId
      ? this.organizations.get(project.b2bOrganizationId)
      : (customer?.b2bOrganizationId ? this.organizations.get(customer.b2bOrganizationId) : null);
    const engineer = this.employees.get(project.assignedEngineerId || customer?.assignedEmployeeId || '');
    const admin = engineer ? this.admins.get(engineer.reportingAdminId) : null;
    const isB2B = !!org || customer?.customerType === 'commercial' || customer?.customerType === 'industrial';

    const stages = project.stages && project.stages.length > 0 ? project.stages : initializeProjectStages();
    const stageHistory = project.stageHistory || [];

    // 1. Project Progress
    const completedStagesCount = stages.filter((s) => s.status === 'completed').length;
    const applicableStagesCount = stages.filter((s) => s.status !== 'not_applicable').length || 1;
    const projectProgress = Math.round((completedStagesCount / applicableStagesCount) * 100);

    // 2. Payments & Payment Progress
    const payment = Array.from(this.payments.values()).find((p) => p.projectId === projectId) || {
      id: `pay-${projectId}`,
      projectId,
      customerId: project.customerId,
      totalAmount: project.totalCost || 300000,
      paidAmount: 0,
      balanceAmount: project.totalCost || 300000,
      status: 'pending' as const,
      installments: [],
    };
    const paymentProgress = payment.totalAmount > 0 ? Math.round((payment.paidAmount / payment.totalAmount) * 100) : 0;

    // 3. Documents
    const documents = Array.from(this.documents.values()).filter((d) => d.projectId === projectId);

    // 4. Installation & Installation Progress
    const installation = Array.from(this.installations.values()).find((i) => i.projectId === projectId) || null;
    const installationStageKeys = ['structure_supply', 'structure_installation', 'wiring_earthing_supply', 'wiring_earthing_installation', 'system_supply', 'system_installation', 'details_uploaded'];
    const instCompleted = stages.filter((s) => installationStageKeys.includes(s.stageKey) && s.status === 'completed').length;
    const installationProgress = Math.round((instCompleted / installationStageKeys.length) * 100);

    // 5. Subsidy & Subsidy Progress
    const subsidy = Array.from(this.subsidies.values()).find((s) => s.projectId === projectId) || null;
    let subsidyProgress = 0;
    if (subsidy) {
      if (subsidy.subsidyStatus === 'redeemed') subsidyProgress = 100;
      else if (subsidy.subsidyStatus === 'approved') subsidyProgress = 75;
      else if (subsidy.subsidyStatus === 'inspection_pending' || subsidy.inspectionStatus === 'passed') subsidyProgress = 50;
      else if (subsidy.subsidyStatus === 'under_process' || subsidy.subsidyStatus === 'applied') subsidyProgress = 25;
    }

    // 6. Invoices
    const invoice = Array.from(this.invoices.values()).find((inv) => inv.projectId === projectId) || null;

    // 7. Warranties
    const warranty = Array.from(this.warranties.values()).find((w) => w.projectId === projectId) || null;

    // 8. Audit Logs
    const relatedLogs = this.auditLogs.filter((l) => l.entityId === projectId || l.entityId === project.customerId);

    return {
      project: {
        ...project,
        isB2B,
        customerType: isB2B ? 'B2B' : 'B2C',
        customerCategory: isB2B ? 'B2B Commercial & Industrial' : 'B2C Residential Rooftop',
        customer,
        organization: org,
        assignedEmployee: engineer ? {
          id: engineer.id,
          name: `${engineer.firstName} ${engineer.lastName}`,
          code: engineer.employeeCode,
          department: engineer.department,
          region: engineer.assignedRegion,
        } : null,
        assignedAdmin: admin ? {
          id: admin.id,
          name: `${admin.firstName} ${admin.lastName}`,
          region: admin.branchRegion,
        } : null,
        stages,
        stageHistory,
      },
      kpiProgress: {
        projectProgress,
        paymentProgress,
        installationProgress,
        subsidyProgress,
      },
      payment,
      documents,
      installation,
      subsidy,
      invoice,
      warranty,
      activity: relatedLogs,
    };
  }

  public recordPaymentTransaction(params: {
    projectId: string;
    installmentType: PaymentInstallmentType;
    installmentTitle?: string;
    amount: number;
    paymentMode: 'Cash' | 'Cheque' | 'UPI' | 'NEFT_RTGS' | 'Jan_Samarth_Loan' | 'Private_Bank_Loan';
    paymentDate: string;
    referenceNumber: string;
    receiptUrl?: string;
    remarks?: string;
    actor: { userId: string; name: string; role: string };
  }): { success: boolean; transaction?: PaymentTransaction; payment?: PaymentRecord; error?: string } {
    const project = this.projects.get(params.projectId);
    if (!project) return { success: false, error: 'Project not found' };

    let payment = Array.from(this.payments.values()).find((p) => p.projectId === params.projectId);
    if (!payment) {
      payment = {
        id: `pay-${params.projectId}`,
        projectId: params.projectId,
        customerId: project.customerId,
        totalAmount: project.totalCost || 300000,
        totalProjectAmount: project.totalCost || 300000,
        paidAmount: 0,
        totalPaid: 0,
        balanceAmount: project.totalCost || 300000,
        pendingAmount: project.totalCost || 300000,
        paymentPercentage: 0,
        status: 'pending',
        installments: [],
        transactions: [],
      };
      this.payments.set(payment.id, payment);
    }

    if (!payment.transactions) payment.transactions = [];
    if (!payment.installments) payment.installments = [];

    const receiptSuffix = Math.floor(1000 + Math.random() * 9000);
    const receiptNumber = `REC-2026-${receiptSuffix}`;
    const txnId = `txn-${Date.now()}-${receiptSuffix}`;

    const newTransaction: PaymentTransaction = {
      id: txnId,
      receiptNumber,
      paymentRecordId: payment.id,
      projectId: params.projectId,
      customerId: project.customerId,
      installmentType: params.installmentType,
      installmentTitle: params.installmentTitle || params.installmentType.replace('_', ' ').toUpperCase(),
      amount: Number(params.amount),
      paymentMode: params.paymentMode,
      paymentDate: params.paymentDate || new Date().toISOString().split('T')[0],
      referenceNumber: params.referenceNumber,
      receiptUrl: params.receiptUrl || `/receipts/${receiptNumber}.pdf`,
      remarks: params.remarks,
      recordedByUserId: params.actor.userId,
      recordedByUserName: params.actor.name,
      recordedByUserRole: params.actor.role,
      createdAt: new Date().toISOString(),
    };

    payment.transactions.push(newTransaction);

    // Recompute totalPaid, balanceAmount, paymentPercentage, status
    const totalPaid = payment.transactions.reduce((acc, t) => acc + (t.amount || 0), 0);
    const totalProjectAmount = payment.totalProjectAmount || payment.totalAmount || project.totalCost || 300000;
    const balanceAmount = Math.max(0, totalProjectAmount - totalPaid);
    const paymentPercentage = totalProjectAmount > 0 ? Math.min(100, Math.round((totalPaid / totalProjectAmount) * 100)) : 0;

    payment.paidAmount = totalPaid;
    payment.totalPaid = totalPaid;
    payment.balanceAmount = balanceAmount;
    payment.pendingAmount = balanceAmount;
    payment.paymentPercentage = paymentPercentage;

    if (totalPaid >= totalProjectAmount) {
      payment.status = 'paid';
    } else if (totalPaid > 0) {
      payment.status = 'partially_paid';
    } else {
      payment.status = 'pending';
    }

    // Update matching installment status if exists
    const matchingInst = payment.installments.find((i) => i.installmentType === params.installmentType);
    if (matchingInst) {
      matchingInst.status = 'paid';
      matchingInst.paidDate = params.paymentDate;
      matchingInst.paymentMethod = params.paymentMode;
      matchingInst.referenceNumber = params.referenceNumber;
    }

    // Auto update project stage for Cash/Loan if relevant
    if (params.installmentType === 'booking_amount' && project.stages) {
      const cashStage = project.stages.find((s) => s.stageKey === 'cash');
      if (cashStage && (params.paymentMode === 'Cash' || params.paymentMode === 'UPI' || params.paymentMode === 'NEFT_RTGS')) {
        cashStage.status = 'completed';
        cashStage.completionDate = params.paymentDate;
      }
    }

    return { success: true, transaction: newTransaction, payment };
  }

  // --- DOCUMENT MANAGEMENT ENGINE ---

  public static readonly STANDARD_DOCUMENT_CATALOG: RequiredDocumentChecklistItem[] = [
    {
      docTypeCode: 'electricity_bill',
      docTypeName: 'Electricity Bill & Sanction NOC',
      category: 'utility_bill',
      isMandatory: true,
      applicableTo: 'all',
      description: 'Latest 3 months electricity bill showing sanctioned load, consumer account number, and meter sanction.',
    },
    {
      docTypeCode: 'identity_proof',
      docTypeName: 'Customer Aadhar Card / ID Proof',
      category: 'identity',
      isMandatory: true,
      applicableTo: 'b2c',
      description: 'Government issued KYC identity proof (Aadhar Card with QR / Passport / Voter ID).',
    },
    {
      docTypeCode: 'pan_card',
      docTypeName: 'PAN Card Copy',
      category: 'identity',
      isMandatory: true,
      applicableTo: 'all',
      description: 'Customer or Organization PAN card for tax compliance and subsidy portal linking.',
    },
    {
      docTypeCode: 'property_tax',
      docTypeName: 'Property Tax Receipt / Ownership Proof',
      category: 'site_docs',
      isMandatory: true,
      applicableTo: 'all',
      description: 'Municipal property tax receipt or registry copy confirming rooftop ownership.',
    },
    {
      docTypeCode: 'site_survey',
      docTypeName: 'Site Survey & Shadow Analysis Report',
      category: 'site_docs',
      isMandatory: true,
      applicableTo: 'all',
      description: 'Field engineer site survey report including rooftop structural azimuth, tilt angle, and 3D shadow analysis.',
    },
    {
      docTypeCode: 'technical_sld',
      docTypeName: 'Single Line Diagram (SLD) & Rooftop Layout',
      category: 'technical_sld',
      isMandatory: true,
      applicableTo: 'all',
      description: 'AutoCAD Single Line Electrical Diagram with array layout, string inverters, and DCDB/ACDB wiring.',
    },
    {
      docTypeCode: 'work_order',
      docTypeName: 'Signed EPC Work Order & Customer Agreement',
      category: 'agreement',
      isMandatory: true,
      applicableTo: 'all',
      description: 'Executed bilateral contract specifying project scope, warranty terms, and milestone payment schedule.',
    },
    {
      docTypeCode: 'net_metering_noc',
      docTypeName: 'DISCOM Net-Metering Application & TFR Approval',
      category: 'site_docs',
      isMandatory: true,
      applicableTo: 'all',
      description: 'Technical Feasibility Report (TFR) approval letter issued by state power distribution company.',
    },
    {
      docTypeCode: 'gst_certificate',
      docTypeName: 'GST Registration Certificate',
      category: 'identity',
      isMandatory: true,
      applicableTo: 'b2b',
      description: 'Form GST REG-06 showing active GSTIN for commercial/industrial input tax credit claims.',
    },
    {
      docTypeCode: 'loan_sanction',
      docTypeName: 'Jan Samarth / Bank Loan Sanction Letter',
      category: 'agreement',
      isMandatory: false,
      applicableTo: 'all',
      description: 'National portal Jan Samarth loan approval or commercial banker sanction letter.',
    },
    {
      docTypeCode: 'plant_commissioning',
      docTypeName: 'Plant Joint Inspection & Commissioning Report',
      category: 'commissioning',
      isMandatory: true,
      applicableTo: 'all',
      description: 'Final plant synchronisation certificate signed by DISCOM net-metering officer and EPC engineer.',
    },
    {
      docTypeCode: 'subsidy_undertaking',
      docTypeName: 'MNRE / State Solar Subsidy Undertaking',
      category: 'subsidy',
      isMandatory: true,
      applicableTo: 'b2c',
      description: 'Signed Annexure affidavit for PM Surya Ghar / National Portal Direct Benefit Transfer subsidy.',
    },
    {
      docTypeCode: 'warranty_certificate',
      docTypeName: 'PV Modules & Inverter Warranty Certificates',
      category: 'warranty',
      isMandatory: true,
      applicableTo: 'all',
      description: 'Manufacturer 25-year performance warranty for solar panels and 5/10-year warranty for inverters.',
    },
  ];

  public uploadDocument(params: {
    projectId: string;
    customerId?: string;
    docTypeCode: string;
    docTypeName?: string;
    fileName: string;
    fileType?: string;
    fileSize?: string;
    fileSizeBytes?: number;
    category?: 'identity' | 'utility_bill' | 'agreement' | 'site_docs' | 'technical_sld' | 'subsidy' | 'commissioning' | 'warranty' | 'other';
    remarks?: string;
    actor: { userId: string; name: string; role: string };
  }): { success: boolean; document?: DocumentRecord; error?: string } {
    const project = this.projects.get(params.projectId);
    if (!project) {
      return { success: false, error: `Project not found: ${params.projectId}` };
    }

    const customerId = params.customerId || project.customerId;
    const docId = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const cleanFileName = params.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageKey = `projects/${project.projectCode}/documents/${cleanFileName}`;
    const storageUrl = `/api/documents/storage?docId=${docId}`;

    const catalogItem = DatabaseStore.STANDARD_DOCUMENT_CATALOG.find((c) => c.docTypeCode === params.docTypeCode);
    const docTypeName = params.docTypeName || catalogItem?.docTypeName || params.docTypeCode.replace(/_/g, ' ').toUpperCase();
    const category = params.category || (catalogItem?.category as any) || 'site_docs';

    const newDoc: DocumentRecord = {
      id: docId,
      projectId: params.projectId,
      customerId,
      docTypeCode: params.docTypeCode,
      docTypeName,
      fileName: params.fileName,
      fileType: params.fileType || 'application/pdf',
      fileSize: params.fileSize || '1.2 MB',
      fileSizeBytes: params.fileSizeBytes || 1258291,
      storageKey,
      storageUrl,
      category,
      verificationStatus: 'uploaded',
      uploadedAt: new Date().toISOString(),
      uploadedByUserId: params.actor.userId,
      uploadedByUserName: params.actor.name,
      uploadedByUserRole: params.actor.role,
      remarks: params.remarks,
      version: 1,
    };

    this.documents.set(newDoc.id, newDoc);
    return { success: true, document: newDoc };
  }

  public replaceDocument(
    docId: string,
    params: {
      fileName: string;
      fileType?: string;
      fileSize?: string;
      fileSizeBytes?: number;
      remarks?: string;
      actor: { userId: string; name: string; role: string };
    }
  ): { success: boolean; document?: DocumentRecord; error?: string } {
    const doc = this.documents.get(docId);
    if (!doc) return { success: false, error: 'Document not found' };

    const project = this.projects.get(doc.projectId);
    const cleanFileName = params.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageKey = `projects/${project?.projectCode || 'PROJ'}/documents/v${(doc.version || 1) + 1}_${cleanFileName}`;

    doc.fileName = params.fileName;
    if (params.fileType) doc.fileType = params.fileType;
    if (params.fileSize) doc.fileSize = params.fileSize;
    if (params.fileSizeBytes) doc.fileSizeBytes = params.fileSizeBytes;
    doc.storageKey = storageKey;
    doc.storageUrl = `/api/documents/storage?docId=${doc.id}&v=${(doc.version || 1) + 1}`;
    doc.verificationStatus = 'uploaded'; // reset to uploaded for re-verification
    doc.uploadedAt = new Date().toISOString();
    doc.uploadedByUserId = params.actor.userId;
    doc.uploadedByUserName = params.actor.name;
    doc.uploadedByUserRole = params.actor.role;
    doc.version = (doc.version || 1) + 1;
    if (params.remarks) doc.remarks = params.remarks;
    doc.verifiedAt = undefined;
    doc.verifiedBy = undefined;
    doc.verifiedByUserId = undefined;
    doc.rejectionReason = undefined;

    return { success: true, document: doc };
  }

  public updateDocumentVerification(
    docId: string,
    params: {
      status: 'verified' | 'rejected' | 'under_review';
      reason?: string;
      actor: { userId: string; name: string; role: string };
    }
  ): { success: boolean; document?: DocumentRecord; error?: string } {
    const doc = this.documents.get(docId);
    if (!doc) return { success: false, error: 'Document not found' };

    doc.verificationStatus = params.status;
    if (params.status === 'verified') {
      doc.verifiedAt = new Date().toISOString();
      doc.verifiedBy = params.actor.name;
      doc.verifiedByUserId = params.actor.userId;
      doc.rejectionReason = undefined;
    } else if (params.status === 'rejected') {
      doc.verifiedAt = new Date().toISOString();
      doc.verifiedBy = params.actor.name;
      doc.verifiedByUserId = params.actor.userId;
      doc.rejectionReason = params.reason || 'Document did not meet statutory requirements';
    }

    return { success: true, document: doc };
  }

  public deleteDocument(docId: string): { success: boolean; error?: string } {
    if (!this.documents.has(docId)) {
      return { success: false, error: 'Document not found' };
    }
    this.documents.delete(docId);
    return { success: true };
  }

  public getProjectCompliance(projectId: string) {
    const project = this.projects.get(projectId);
    if (!project) return null;

    const cust = this.customers.get(project.customerId);
    const isB2B = !!project.b2bOrganizationId || cust?.customerType === 'commercial' || cust?.customerType === 'industrial';
    const applicableType = isB2B ? 'b2b' : 'b2c';

    const projectDocs = Array.from(this.documents.values()).filter((d) => d.projectId === projectId);
    const applicableCatalog = DatabaseStore.STANDARD_DOCUMENT_CATALOG.filter(
      (item) => item.applicableTo === 'all' || item.applicableTo === applicableType
    );

    const checklist = applicableCatalog.map((catItem) => {
      const existing = projectDocs.find(
        (d) => d.docTypeCode === catItem.docTypeCode || d.docTypeName.toLowerCase().includes(catItem.docTypeName.toLowerCase())
      );
      return {
        ...catItem,
        status: existing ? existing.verificationStatus : ('required' as DocumentVerificationStatus),
        document: existing || null,
      };
    });

    const totalRequired = checklist.filter((c) => c.isMandatory).length;
    const verifiedCount = checklist.filter((c) => c.status === 'verified').length;
    const uploadedCount = checklist.filter((c) => c.status === 'uploaded' || c.status === 'under_review').length;
    const rejectedCount = checklist.filter((c) => c.status === 'rejected').length;
    const missingCount = checklist.filter((c) => c.status === 'required' || c.status === 'rejected').length;
    const complianceRate = totalRequired > 0 ? Math.min(100, Math.round((verifiedCount / totalRequired) * 100)) : 100;

    return {
      projectId,
      projectCode: project.projectCode,
      projectName: project.projectName,
      customerName: cust ? `${cust.firstName} ${cust.lastName}` : 'Client',
      isB2B,
      totalRequired,
      verifiedCount,
      uploadedCount,
      rejectedCount,
      missingCount,
      complianceRate,
      checklist,
    };
  }

  // --- INSTALLATION ENGINE (9 Structured Stages) ---

  public static readonly CANONICAL_INSTALLATION_STAGES: Array<{
    stageKey: any;
    stageName: string;
    sequenceOrder: number;
    description: string;
  }> = [
    {
      stageKey: 'structure_supply',
      stageName: 'Structure Supply',
      sequenceOrder: 1,
      description: 'Hot-dip galvanized (HDG) mounting structure materials, base plates, and anchor hardware dispatched and delivered to site.',
    },
    {
      stageKey: 'structure_installation',
      stageName: 'Structure Installation',
      sequenceOrder: 2,
      description: 'Civil anchor grouting, column erection, purlin alignment, and torque inspection with optimal seasonal azimuth & tilt angle.',
    },
    {
      stageKey: 'wiring_earthing_supply',
      stageName: 'Wiring & Earthing Supply',
      sequenceOrder: 3,
      description: 'Solar DC cabling (UV protected 4/6 sq.mm), copper bonded chemical earthing electrodes, lightning arresters (ESE/LA), and conduit pipes.',
    },
    {
      stageKey: 'wiring_earthing_installation',
      stageName: 'Wiring & Earthing Installation',
      sequenceOrder: 4,
      description: 'Earthing pit drilling, chemical compound backfilling, dedicated earthing conductor bonding (DC, AC, LA < 2 Ohms), and cable tray routing.',
    },
    {
      stageKey: 'system_supply',
      stageName: 'System Supply',
      sequenceOrder: 5,
      description: 'High-efficiency Mono PERC/TOPCon solar PV modules, On-Grid string inverters, DCDB with Type-II SPD, and ACDB with MCCB.',
    },
    {
      stageKey: 'system_installation',
      stageName: 'System Installation',
      sequenceOrder: 6,
      description: 'Module clamping, MC4 connector crimping, string voltage testing (Voc/Isc), inverter wall mounting, and AC/DC terminations.',
    },
    {
      stageKey: 'net_meter_installation',
      stageName: 'Net Meter Installation',
      sequenceOrder: 7,
      description: 'DISCOM bi-directional net meter testing, CT/PT ratio verification, and bi-directional meter installation on consumer premises.',
    },
    {
      stageKey: 'inspection',
      stageName: 'Inspection',
      sequenceOrder: 8,
      description: 'CEIG/DISCOM Assistant Engineer joint technical inspection, anti-islanding safety verification, and synchronization clearance.',
    },
    {
      stageKey: 'warranty',
      stageName: 'Warranty',
      sequenceOrder: 9,
      description: 'Issuance of 25-Year Linear Performance Warranty for solar modules, 5/10-Year Inverter Warranty cards, and plant handover.',
    },
  ];

  public getOrCreateInstallation(projectId: string): InstallationRecord {
    let existing = Array.from(this.installations.values()).find((i) => i.projectId === projectId);
    if (existing) return existing;

    const project = this.projects.get(projectId);
    const instId = `inst-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const stages = DatabaseStore.CANONICAL_INSTALLATION_STAGES.map((s) => ({
      stageKey: s.stageKey,
      stageName: s.stageName,
      sequenceOrder: s.sequenceOrder,
      status: 'pending' as const,
      plannedDate: project?.startDate || new Date().toISOString().split('T')[0],
      assignedPerson: project?.assignedEngineerId ? this.employees.get(project.assignedEngineerId)?.firstName : 'Field Team',
      assignedTeam: 'Solar Installation Crew',
      remarks: s.description,
    }));

    const newInst: InstallationRecord = {
      id: instId,
      projectId,
      customerId: project?.customerId,
      leadTechnicianId: project?.assignedEngineerId,
      leadTechnicianName: project?.assignedEngineerId
        ? `${this.employees.get(project.assignedEngineerId)?.firstName} ${this.employees.get(project.assignedEngineerId)?.lastName}`
        : 'Assigned Engineer',
      assignedTeam: 'Solar EPC Execution Unit',
      status: 'pending',
      tiltAngle: 25,
      panelCount: project?.capacityKw ? Math.ceil((project.capacityKw * 1000) / 550) : 10,
      panelModel: 'Tier-1 Mono PERC 550W Half-Cut Solar Modules',
      inverterModel: 'Growatt/Sungrow High Efficiency Dual MPPT Inverter',
      structureType: 'Elevated HDG Standard Rooftop Mounting Structure',
      scheduledDate: project?.startDate || new Date().toISOString().split('T')[0],
      installationProgress: 0,
      stages,
      updatedAt: new Date().toISOString(),
    };

    this.installations.set(newInst.id, newInst);
    return newInst;
  }

  public updateInstallationStage(
    projectId: string,
    stageKey: string,
    updates: {
      status: 'pending' | 'in_progress' | 'completed' | 'delayed' | 'on_hold';
      plannedDate?: string;
      actualDate?: string;
      assignedPerson?: string;
      assignedTeam?: string;
      remarks?: string;
      photos?: string[];
      documents?: string[];
    },
    actor: { userId: string; name: string; role: string }
  ): { success: boolean; installation?: InstallationRecord; error?: string } {
    const inst = this.getOrCreateInstallation(projectId);
    const stage = inst.stages.find((s) => s.stageKey === stageKey);
    if (!stage) return { success: false, error: `Installation stage '${stageKey}' not found` };

    stage.status = updates.status;
    if (updates.plannedDate) stage.plannedDate = updates.plannedDate;
    if (updates.actualDate !== undefined) {
      stage.actualDate = updates.actualDate;
    } else if (updates.status === 'completed' && !stage.actualDate) {
      stage.actualDate = new Date().toISOString().split('T')[0];
    }
    if (updates.assignedPerson) stage.assignedPerson = updates.assignedPerson;
    if (updates.assignedTeam) stage.assignedTeam = updates.assignedTeam;
    if (updates.remarks) stage.remarks = updates.remarks;
    if (updates.photos) stage.photos = updates.photos;
    if (updates.documents) stage.documents = updates.documents;
    stage.updatedAt = new Date().toISOString();
    stage.updatedBy = actor.name;

    // Recalculate installation progress %
    const completedCount = inst.stages.filter((s) => s.status === 'completed').length;
    inst.installationProgress = Math.round((completedCount / inst.stages.length) * 100);

    if (inst.installationProgress === 100) {
      inst.status = 'completed';
      inst.completionDate = new Date().toISOString().split('T')[0];
    } else if (inst.installationProgress > 0) {
      inst.status = 'in_progress';
    } else {
      inst.status = 'pending';
    }

    inst.updatedAt = new Date().toISOString();
    return { success: true, installation: inst };
  }

  // --- SUBSIDY ENGINE (Completely Decoupled) ---

  public static calculateSubsidyAmount(capacityKw: number, isB2C: boolean = true): number {
    if (!isB2C || capacityKw <= 0) return 0;
    // PM Surya Ghar Muft Bijli Yojana standard slabs:
    // 1 kW: ₹30,000
    // 2 kW: ₹60,000
    // 3 kW and above: ₹78,000 (capped at ₹78,000 for residential single consumer)
    if (capacityKw >= 3.0) return 78000;
    if (capacityKw >= 2.0) return 60000;
    if (capacityKw >= 1.0) return 30000;
    return Math.round(capacityKw * 30000);
  }

  public getOrCreateSubsidy(projectId: string): SubsidyRecord {
    let existing = Array.from(this.subsidies.values()).find((s) => s.projectId === projectId);
    if (existing) return existing;

    const project = this.projects.get(projectId);
    const cust = project ? this.customers.get(project.customerId) : null;
    const isB2B = !!project?.b2bOrganizationId || cust?.customerType === 'commercial' || cust?.customerType === 'industrial';
    const capacityKw = project?.capacityKw || cust?.proposedCapacityKw || 5.0;
    const subsidyApplicable = !isB2B;
    const subsidyAmount = DatabaseStore.calculateSubsidyAmount(capacityKw, subsidyApplicable);

    const subId = `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newSub: SubsidyRecord = {
      id: subId,
      projectId,
      customerId: project?.customerId || '',
      solarCapacityKw: capacityKw,
      subsidyApplicable,
      schemeName: subsidyApplicable
        ? 'PM Surya Ghar: Muft Bijli Yojana (National Solar Portal)'
        : 'Commercial Solar (Accelerated Depreciation Route)',
      applicationNumber: subsidyApplicable ? `PMSGY-${cust?.district ? cust.district.substring(0, 2).toUpperCase() : 'DL'}-${Date.now().toString().slice(-5)}` : undefined,
      applicationDate: undefined,
      subsidyAmount,
      inspectionStatus: 'pending',
      subsidyStatus: subsidyApplicable ? 'not_applied' : 'not_applied',
      redemptionDate: undefined,
      discomConsumerNo: cust?.electricityConsumerNumber || 'BSES-DL-0000',
      remarks: subsidyApplicable ? 'National Portal PM Surya Ghar subsidy tracking initiated.' : 'Commercial project; tax depreciation route.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.subsidies.set(newSub.id, newSub);
    return newSub;
  }

  public updateSubsidy(
    projectId: string,
    updates: Partial<SubsidyRecord>,
    actor: { userId: string; name: string; role: string }
  ): { success: boolean; subsidy?: SubsidyRecord; error?: string } {
    const sub = this.getOrCreateSubsidy(projectId);

    if (updates.schemeName !== undefined) sub.schemeName = updates.schemeName;
    if (updates.applicationNumber !== undefined) sub.applicationNumber = updates.applicationNumber;
    if (updates.applicationDate !== undefined) sub.applicationDate = updates.applicationDate;
    if (updates.subsidyAmount !== undefined) sub.subsidyAmount = Number(updates.subsidyAmount);
    if (updates.subsidyApplicable !== undefined) sub.subsidyApplicable = updates.subsidyApplicable;
    if (updates.inspectionStatus !== undefined) sub.inspectionStatus = updates.inspectionStatus;
    if (updates.inspectionDate !== undefined) sub.inspectionDate = updates.inspectionDate;
    if (updates.inspectorName !== undefined) sub.inspectorName = updates.inspectorName;
    if (updates.subsidyStatus !== undefined) sub.subsidyStatus = updates.subsidyStatus;
    if (updates.redemptionDate !== undefined) sub.redemptionDate = updates.redemptionDate;
    if (updates.dbtAccountNumber !== undefined) sub.dbtAccountNumber = updates.dbtAccountNumber;
    if (updates.discomConsumerNo !== undefined) sub.discomConsumerNo = updates.discomConsumerNo;
    if (updates.remarks !== undefined) sub.remarks = updates.remarks;
    if (updates.rejectionReason !== undefined) sub.rejectionReason = updates.rejectionReason;

    // Auto set redemption date if redeemed
    if (updates.subsidyStatus === 'redeemed' && !sub.redemptionDate) {
      sub.redemptionDate = new Date().toISOString().split('T')[0];
    }

    sub.updatedAt = new Date().toISOString();
    return { success: true, subsidy: sub };
  }

  // --- NOTIFICATIONS MANAGEMENT ---
  public createNotification(item: Omit<NotificationItem, 'id' | 'createdAt'>): NotificationItem {
    const id = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const fullItem: NotificationItem = {
      ...item,
      id,
      createdAt: new Date().toISOString(),
    };
    this.notifications.set(id, fullItem);
    return fullItem;
  }

  public getNotifications(filter?: {
    userId?: string;
    role?: string;
    unreadOnly?: boolean;
    type?: string;
    limit?: number;
  }): NotificationItem[] {
    let list = Array.from(this.notifications.values());

    if (filter) {
      if (filter.role && filter.role !== 'super_admin') {
        list = list.filter(
          (n) =>
            !n.recipientRole ||
            n.recipientRole === 'all' ||
            n.recipientRole === filter.role ||
            (n.recipientUserId && filter.userId && n.recipientUserId === filter.userId)
        );
      }
      if (filter.unreadOnly) {
        list = list.filter((n) => !n.isRead);
      }
      if (filter.type && filter.type !== 'all') {
        list = list.filter((n) => n.type === filter.type);
      }
    }

    // Sort newest first
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (filter?.limit) {
      return list.slice(0, filter.limit);
    }
    return list;
  }

  public markNotificationAsRead(id: string): boolean {
    const n = this.notifications.get(id);
    if (n) {
      n.isRead = true;
      return true;
    }
    return false;
  }

  public markAllNotificationsAsRead(userId?: string): boolean {
    for (const n of this.notifications.values()) {
      if (!userId || !n.recipientUserId || n.recipientUserId === userId) {
        n.isRead = true;
      }
    }
    return true;
  }

  // --- SECONDARY INDEX MANAGEMENT & FAST O(1) LOOKUPS (ELIMINATES N+1 SCANS) ---
  public getProjectsForCustomer(customerId: string): Project[] {
    const ids = this.idxProjectsByCustomer.get(customerId);
    if (!ids) return [];
    const list: Project[] = [];
    for (const id of ids) {
      const p = this.projects.get(id);
      if (p) list.push(p);
    }
    return list;
  }

  public getProjectsForEmployee(employeeProfileId: string): Project[] {
    const ids = this.idxProjectsByEmployee.get(employeeProfileId);
    if (!ids) return [];
    const list: Project[] = [];
    for (const id of ids) {
      const p = this.projects.get(id);
      if (p) list.push(p);
    }
    return list;
  }

  public getCustomersForEmployee(employeeProfileId: string): CustomerProfile[] {
    const ids = this.idxCustomersByEmployee.get(employeeProfileId);
    if (!ids) return [];
    const list: CustomerProfile[] = [];
    for (const id of ids) {
      const c = this.customers.get(id);
      if (c) list.push(c);
    }
    return list;
  }

  public getPaymentForProject(projectId: string): PaymentRecord | undefined {
    const id = this.idxPaymentsByProject.get(projectId);
    return id ? this.payments.get(id) : undefined;
  }

  public getDocumentsForProject(projectId: string): DocumentRecord[] {
    const ids = this.idxDocumentsByProject.get(projectId);
    if (!ids) return [];
    const list: DocumentRecord[] = [];
    for (const id of ids) {
      const doc = this.documents.get(id);
      if (doc) list.push(doc);
    }
    return list;
  }

  public getDocumentsForCustomer(customerId: string): DocumentRecord[] {
    const ids = this.idxDocumentsByCustomer.get(customerId);
    if (!ids) return [];
    const list: DocumentRecord[] = [];
    for (const id of ids) {
      const doc = this.documents.get(id);
      if (doc) list.push(doc);
    }
    return list;
  }

  public getSubsidyForProject(projectId: string): SubsidyRecord | undefined {
    const id = this.idxSubsidiesByProject.get(projectId);
    return id ? this.subsidies.get(id) : undefined;
  }

  public getInstallationForProject(projectId: string): InstallationRecord | undefined {
    const id = this.idxInstallationsByProject.get(projectId);
    return id ? this.installations.get(id) : undefined;
  }

  public getInvoiceForProject(projectId: string): InvoiceRecord | undefined {
    const id = this.idxInvoicesByProject.get(projectId);
    return id ? this.invoices.get(id) : undefined;
  }

  public getWarrantyForProject(projectId: string): WarrantyRecord | undefined {
    const id = this.idxWarrantiesByProject.get(projectId);
    return id ? this.warranties.get(id) : undefined;
  }

  // --- Dynamic Index Maintainers ---
  public indexProject(p: Project): void {
    if (p.customerId) {
      if (!this.idxProjectsByCustomer.has(p.customerId)) this.idxProjectsByCustomer.set(p.customerId, new Set());
      this.idxProjectsByCustomer.get(p.customerId)!.add(p.id);
    }
    if (p.assignedEngineerId) {
      if (!this.idxProjectsByEmployee.has(p.assignedEngineerId)) this.idxProjectsByEmployee.set(p.assignedEngineerId, new Set());
      this.idxProjectsByEmployee.get(p.assignedEngineerId)!.add(p.id);
    }
  }

  public indexCustomer(c: CustomerProfile): void {
    if (c.assignedEmployeeId) {
      if (!this.idxCustomersByEmployee.has(c.assignedEmployeeId)) this.idxCustomersByEmployee.set(c.assignedEmployeeId, new Set());
      this.idxCustomersByEmployee.get(c.assignedEmployeeId)!.add(c.id);
    }
  }

  public indexPayment(pay: PaymentRecord): void {
    if (pay.projectId) this.idxPaymentsByProject.set(pay.projectId, pay.id);
  }

  public indexDocument(doc: DocumentRecord): void {
    if (doc.projectId) {
      if (!this.idxDocumentsByProject.has(doc.projectId)) this.idxDocumentsByProject.set(doc.projectId, new Set());
      this.idxDocumentsByProject.get(doc.projectId)!.add(doc.id);
    }
    if (doc.customerId) {
      if (!this.idxDocumentsByCustomer.has(doc.customerId)) this.idxDocumentsByCustomer.set(doc.customerId, new Set());
      this.idxDocumentsByCustomer.get(doc.customerId)!.add(doc.id);
    }
  }

  public indexSubsidy(sub: SubsidyRecord): void {
    if (sub.projectId) this.idxSubsidiesByProject.set(sub.projectId, sub.id);
  }

  public indexInstallation(inst: InstallationRecord): void {
    if (inst.projectId) this.idxInstallationsByProject.set(inst.projectId, inst.id);
  }

  public indexInvoice(inv: InvoiceRecord): void {
    if (inv.projectId) this.idxInvoicesByProject.set(inv.projectId, inv.id);
  }

  public indexWarranty(war: WarrantyRecord): void {
    if (war.projectId) this.idxWarrantiesByProject.set(war.projectId, war.id);
  }

  public rebuildIndexes(): void {
    this.idxProjectsByCustomer.clear();
    this.idxProjectsByEmployee.clear();
    this.idxCustomersByEmployee.clear();
    this.idxPaymentsByProject.clear();
    this.idxDocumentsByProject.clear();
    this.idxDocumentsByCustomer.clear();
    this.idxSubsidiesByProject.clear();
    this.idxInstallationsByProject.clear();
    this.idxInvoicesByProject.clear();
    this.idxWarrantiesByProject.clear();

    for (const p of this.projects.values()) this.indexProject(p);
    for (const c of this.customers.values()) this.indexCustomer(c);
    for (const pay of this.payments.values()) this.indexPayment(pay);
    for (const doc of this.documents.values()) this.indexDocument(doc);
    for (const sub of this.subsidies.values()) this.indexSubsidy(sub);
    for (const inst of this.installations.values()) this.indexInstallation(inst);
    for (const inv of this.invoices.values()) this.indexInvoice(inv);
    for (const war of this.warranties.values()) this.indexWarranty(war);
  }
}

/**
 * High-Performance In-Memory Analytics & Query Cache with TTL and Tag Invalidation
 */
export class CacheStore {
  private cache: Map<string, { value: any; expiresAt: number; tags: string[] }> = new Map();

  public get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return item.value as T;
  }

  public set(key: string, value: any, ttlSeconds: number = 60, tags: string[] = []): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
      tags,
    });
  }

  public invalidate(key: string): void {
    this.cache.delete(key);
  }

  public invalidateTags(...tags: string[]): void {
    const tagSet = new Set(tags);
    for (const [key, item] of this.cache.entries()) {
      if (item.tags.some((t) => tagSet.has(t))) {
        this.cache.delete(key);
      }
    }
  }

  public clear(): void {
    this.cache.clear();
  }
}

declare global {
  var __RP_SOLAR_DB__: DatabaseStore | undefined;
  var __RP_SOLAR_CACHE__: CacheStore | undefined;
}

export const db: DatabaseStore = globalThis.__RP_SOLAR_DB__ ?? new DatabaseStore();
export const appCache: CacheStore = globalThis.__RP_SOLAR_CACHE__ ?? new CacheStore();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__RP_SOLAR_DB__ = db;
  globalThis.__RP_SOLAR_CACHE__ = appCache;
}
