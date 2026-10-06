export type UserType = 'super_admin' | 'admin' | 'employee' | 'customer';
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending_verification';
export type CustomerType = 'residential' | 'commercial' | 'industrial' | 'institutional';

export type EmployeeDepartment =
  | 'sales'
  | 'survey_engineering'
  | 'installation_ops'
  | 'subsidy_liaison'
  | 'support'
  | 'accounts';

export interface User {
  id: string;
  email: string;
  username: string;
  phoneNumber: string;
  passwordHash: string;
  userType: UserType;
  status: UserStatus;
  joiningDate: string;
  profileImage?: string;
  failedLoginAttempts: number;
  lockoutUntil: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  branchRegion: string;
  department: string;
  canManageEmployees: boolean;
}

export interface EmployeeProfile {
  id: string;
  userId: string;
  reportingAdminId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  department: EmployeeDepartment;
  designation: string;
  assignedRegion: string;
  maxActiveProjects: number;
}

export interface B2BOrganization {
  id: string;
  orgName: string;
  gstin?: string;
  pan?: string;
  contactPerson: string;
  designation: string;
  contactEmail: string;
  contactMobile: string;
  billingAddress: string;
  district: string;
  state: string;
  pincode: string;
  createdAt: string;
}

export interface B2CWorkflowState {
  discomApplicationType: 'brown_file' | 'new_connection' | 'name_correction' | 'cot' | 'load_increased';
  paymentMode: 'cash' | 'jan_samarth_loan' | 'bank_loan';
  workOrderStatus: 'draft' | 'issued' | 'signed';
  mnreRegistrationStatus: 'pending' | 'registered' | 'approved';
  tfrStatus: 'pending' | 'approved' | 'waived';
  existingLoadKw: number;
  proposedSolarCapacityKw: number;
}

export interface CustomerProfile {
  id: string;
  userId: string;
  assignedEmployeeId: string;
  b2bOrganizationId?: string;
  customerType: CustomerType;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  alternateMobile?: string;
  email: string;
  electricityConsumerNumber: string;
  discomName: string;
  installationAddress: string;
  district: string;
  city: string;
  state: string;
  pincode: string;
  sanctionedLoadKw?: number;
  proposedCapacityKw?: number;
  workflow?: B2CWorkflowState;
  createdAt: string;
}

export type StageStatus = 'not_started' | 'in_progress' | 'completed' | 'blocked' | 'not_applicable';

export type LifecyclePhase =
  | 'onboarding'
  | 'documentation'
  | 'registration'
  | 'work_order'
  | 'structure'
  | 'wiring_earthing'
  | 'system_installation'
  | 'meter'
  | 'inspection'
  | 'subsidy'
  | 'warranty'
  | 'invoice'
  | 'completed';

export interface ProjectStageItem {
  id: string;
  stageKey: string;
  stageName: string;
  order: number;
  lifecyclePhase: LifecyclePhase;
  status: StageStatus;
  completionDate?: string | null;
  updatedBy?: {
    userId: string;
    name: string;
    role: string;
  };
  updatedAt?: string;
  remarks?: string;
  documents?: Array<{
    id: string;
    name: string;
    url?: string;
    uploadedAt: string;
  }>;
}

export interface ProjectStageHistoryEntry {
  id: string;
  projectId: string;
  stageKey: string;
  stageName: string;
  previousStatus: StageStatus;
  newStatus: StageStatus;
  changedByUserId: string;
  changedByUserName: string;
  changedByUserRole: string;
  remarks?: string;
  timestamp: string;
}

export interface Project {
  id: string;
  projectCode: string;
  projectName?: string;
  customerId: string;
  b2bOrganizationId?: string;
  assignedEngineerId: string;
  capacityKw: number;
  systemType: 'on_grid' | 'off_grid' | 'hybrid';
  totalCost: number;
  priority?: 'standard' | 'medium' | 'high' | 'critical';
  status:
    | 'draft'
    | 'in_progress'
    | 'feasibility_survey'
    | 'installation_in_progress'
    | 'net_metering'
    | 'commissioned'
    | 'subsidy_processing'
    | 'completed'
    | 'on_hold'
    | 'cancelled';
  currentStage: string;
  remarks?: string;
  startDate?: string;
  createdAt: string;
  targetCompletionDate?: string;
  actualCommissioningDate?: string;
  stages?: ProjectStageItem[];
  stageHistory?: ProjectStageHistoryEntry[];
}

export type PaymentInstallmentType =
  | 'booking_amount'
  | '1st_installment'
  | '2nd_installment'
  | '3rd_installment'
  | '4th_installment'
  | 'full_payment'
  | 'ad_hoc';

export interface PaymentTransaction {
  id: string;
  receiptNumber: string;
  paymentRecordId: string;
  projectId: string;
  customerId: string;
  installmentType: PaymentInstallmentType | string;
  installmentTitle: string;
  amount: number;
  paymentMode: string;
  paymentDate: string;
  referenceNumber: string;
  receiptUrl?: string;
  remarks?: string;
  recordedByUserId: string;
  recordedByUserName: string;
  recordedByUserRole: string;
  createdAt: string;
}

export interface PaymentInstallment {
  id: string;
  projectId: string;
  installmentNumber: number;
  installmentType: PaymentInstallmentType | string;
  title: string;
  stageName?: string;
  stageTrigger?: string;
  amount: number;
  paidAmount?: number;
  status: 'pending' | 'partially_paid' | 'paid' | 'overdue';
  dueDate?: string;
  paidDate?: string;
  paymentMethod?: string;
  referenceNumber?: string;
}

export interface PaymentRecord {
  id: string;
  projectId: string;
  customerId: string;
  totalAmount: number;
  totalProjectAmount?: number;
  paidAmount: number;
  totalPaid?: number;
  balanceAmount: number;
  pendingAmount?: number;
  paymentPercentage?: number;
  status: 'pending' | 'partially_paid' | 'paid' | 'overdue';
  dueDate?: string;
  installments?: PaymentInstallment[];
  transactions?: PaymentTransaction[];
}

export type DocumentVerificationStatus =
  | 'required'
  | 'uploaded'
  | 'under_review'
  | 'verified'
  | 'rejected'
  | 'pending_verification';

export interface DocumentRecord {
  id: string;
  projectId: string;
  customerId: string;
  docTypeName: string;
  docTypeCode?: string;
  fileName: string;
  fileType?: string;
  fileSize?: string;
  fileSizeBytes?: number;
  storageUrl?: string;
  storageKey?: string;
  category?: 'identity' | 'utility_bill' | 'agreement' | 'site_docs' | 'technical_sld' | 'subsidy' | 'commissioning' | 'warranty' | 'other';
  verificationStatus: DocumentVerificationStatus;
  uploadedAt: string;
  uploadedByUserId?: string;
  uploadedByUserName?: string;
  uploadedByUserRole?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  verifiedByUserId?: string;
  rejectionReason?: string;
  remarks?: string;
  version?: number;
  previousVersionId?: string;
}

export interface RequiredDocumentChecklistItem {
  docTypeCode: string;
  docTypeName: string;
  category: string;
  isMandatory: boolean;
  applicableTo: 'all' | 'b2c' | 'b2b';
  description: string;
}

export type InstallationStageKey =
  | 'structure_supply'
  | 'structure_installation'
  | 'wiring_earthing_supply'
  | 'wiring_earthing_installation'
  | 'system_supply'
  | 'system_installation'
  | 'net_meter_installation'
  | 'inspection'
  | 'warranty';

export interface InstallationStageItem {
  stageKey: InstallationStageKey;
  stageName: string;
  sequenceOrder: number;
  status: 'pending' | 'in_progress' | 'completed' | 'delayed' | 'on_hold';
  plannedDate?: string;
  actualDate?: string;
  assignedPerson?: string;
  assignedTeam?: string;
  remarks?: string;
  photos?: string[];
  documents?: string[];
  updatedAt?: string;
  updatedBy?: string;
}

export interface InstallationRecord {
  id: string;
  projectId: string;
  customerId?: string;
  leadTechnicianId?: string;
  leadTechnicianName?: string;
  assignedTeam?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'safety_verified';
  tiltAngle: number;
  panelCount?: number;
  panelModel?: string;
  inverterModel?: string;
  inverterSerial?: string;
  structureType?: string;
  scheduledDate: string;
  completionDate?: string;
  safetyAuditPassed?: boolean;
  sitePhotos?: string[];
  installationProgress: number; // 0 to 100%
  stages: InstallationStageItem[];
  updatedAt?: string;
}

export type SubsidyStatus =
  | 'not_applied'
  | 'applied'
  | 'under_process'
  | 'inspection_pending'
  | 'approved'
  | 'rejected'
  | 'redeemed';

export type SubsidyInspectionStatus =
  | 'pending'
  | 'scheduled'
  | 'passed'
  | 'failed';

export interface SubsidyRecord {
  id: string;
  projectId: string;
  customerId: string;
  solarCapacityKw: number;
  subsidyApplicable: boolean;
  schemeName: string;
  applicationNumber?: string;
  applicationDate?: string;
  subsidyAmount: number;
  inspectionStatus: SubsidyInspectionStatus;
  subsidyStatus: SubsidyStatus;
  redemptionDate?: string;
  remarks?: string;
  dbtAccountNumber?: string;
  discomConsumerNo?: string;
  inspectionDate?: string;
  inspectorName?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  projectId: string;
  customerId: string;
  issueDate: string;
  dueDate: string;
  baseAmount: number;
  taxGstAmount: number;
  totalAmount: number;
  status: 'paid' | 'unpaid' | 'partially_paid' | 'draft';
  paymentMode?: string;
  lineItems: Array<{
    description: string;
    capacityKw?: number;
    rate: number;
    total: number;
  }>;
}

export interface WarrantyRecord {
  id: string;
  certificateNumber: string;
  projectId: string;
  customerId: string;
  panelWarrantyYears: number;
  inverterWarrantyYears: number;
  workmanshipWarrantyYears: number;
  startDate: string;
  endDate: string;
  panelManufacturer: string;
  inverterManufacturer: string;
  status: 'active' | 'pending_issuance' | 'expired';
}

export type NotificationType =
  | 'customer_assigned'
  | 'project_assigned'
  | 'project_stage_updated'
  | 'document_uploaded'
  | 'document_rejected'
  | 'payment_received'
  | 'payment_overdue'
  | 'installation_scheduled'
  | 'installation_completed'
  | 'inspection_pending'
  | 'subsidy_updated'
  | 'warranty_issued'
  | 'invoice_uploaded'
  | 'system_alert';

export interface NotificationItem {
  id: string;
  recipientUserId?: string;
  recipientRole?: 'super_admin' | 'admin' | 'employee' | 'customer' | 'all';
  type: NotificationType;
  title: string;
  message: string;
  entityType?: 'customer' | 'project' | 'payment' | 'document' | 'installation' | 'subsidy' | 'invoice' | 'warranty';
  entityId?: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  actorUserId: string | null;
  actorName?: string;
  actorEmail: string | null;
  actorUserType: string | null;
  actorRole?: string;
  actorIp?: string;
  userAgent?: string;
  action: string;
  module?: string;
  entityTable: string;
  entityId: string;
  recordIdentifier?: string;
  previousValue?: string;
  newValue?: string;
  details: string;
  status: 'SUCCESS' | 'BLOCKED_UNAUTHORIZED' | 'FAILED';
  timestamp?: string;
  createdAt: string;
}

export interface SessionPayload {
  userId: string;
  email: string;
  username: string;
  userType: UserType;
  profileId: string;
  reportingAdminId?: string;
  assignedRegion?: string;
  sessionId: string;
}

export interface EmployeePerformanceStats {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  designation: string;
  assignedRegion: string;
  reportingAdminName: string;
  totalCustomers: number;
  b2bCustomers: number;
  b2cCustomers: number;
  activeProjects: number;
  completedProjects: number;
  totalSolarCapacityKw: number;
  pendingTasks: number;
  totalPaymentCollections: number;
  pendingPaymentCollections: number;
  completionRatePercent: number;
}
