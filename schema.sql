-- ============================================================================
-- R P SOLAR MANAGEMENT PORTAL - POSTGRESQL PRODUCTION DDL SCHEMA
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. AUTHENTICATION & ACCESS CONTROL (RBAC)
-- ============================================================================

CREATE TYPE user_status_enum AS ENUM ('active', 'inactive', 'suspended', 'pending_verification');
CREATE TYPE user_type_enum AS ENUM ('super_admin', 'admin', 'employee', 'customer');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(32) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    user_type user_type_enum NOT NULL,
    status user_status_enum NOT NULL DEFAULT 'pending_verification',
    email_verified_at TIMESTAMPTZ NULL,
    phone_verified_at TIMESTAMPTZ NULL,
    last_login_at TIMESTAMPTZ NULL,
    failed_login_attempts INT NOT NULL DEFAULT 0,
    lockout_until TIMESTAMPTZ NULL,
    mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_secret VARCHAR(255) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    deleted_at TIMESTAMPTZ NULL
);

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(64) UNIQUE NOT NULL,
    code VARCHAR(64) UNIQUE NOT NULL,
    description TEXT,
    is_system_role BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    deleted_at TIMESTAMPTZ NULL
);

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module VARCHAR(64) NOT NULL,
    action VARCHAR(64) NOT NULL,
    code VARCHAR(128) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

CREATE TABLE role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_role_permission UNIQUE(role_id, permission_id)
);

CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_role UNIQUE(user_id, role_id)
);

-- ============================================================================
-- 2. USER HIERARCHY & PROFILES
-- ============================================================================

CREATE TABLE b2b_organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_name VARCHAR(255) NOT NULL,
    registration_number VARCHAR(100) UNIQUE,
    gstin VARCHAR(30) UNIQUE,
    pan VARCHAR(20),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(32),
    billing_address JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    deleted_at TIMESTAMPTZ NULL
);

CREATE TABLE admin_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    branch_region VARCHAR(100) NOT NULL,
    department VARCHAR(100),
    can_manage_employees BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    deleted_at TIMESTAMPTZ NULL
);

CREATE TYPE employee_department_enum AS ENUM ('sales', 'survey_engineering', 'installation_ops', 'subsidy_liaison', 'support', 'accounts');

CREATE TABLE employee_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    reporting_admin_id UUID NOT NULL REFERENCES admin_profiles(id),
    employee_code VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    department employee_department_enum NOT NULL,
    designation VARCHAR(100) NOT NULL,
    assigned_region VARCHAR(100) NOT NULL,
    max_active_projects INT NOT NULL DEFAULT 25,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    deleted_at TIMESTAMPTZ NULL
);

CREATE TYPE customer_type_enum AS ENUM ('residential', 'commercial', 'industrial', 'institutional');

CREATE TABLE customer_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    assigned_employee_id UUID NULL REFERENCES employee_profiles(id),
    b2b_organization_id UUID NULL REFERENCES b2b_organizations(id),
    customer_type customer_type_enum NOT NULL DEFAULT 'residential',
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    electricity_consumer_number VARCHAR(100),
    discom_name VARCHAR(150),
    sanctioned_load_kw NUMERIC(10, 2),
    installation_address JSONB NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(12) NOT NULL,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    deleted_at TIMESTAMPTZ NULL
);

-- ============================================================================
-- 3. PROJECT & STAGE ENGINE
-- ============================================================================

CREATE TYPE project_status_enum AS ENUM ('draft', 'feasibility_survey', 'proposal_sent', 'agreement_signed', 'discom_sanction', 'procurement', 'installation_in_progress', 'net_metering', 'commissioned', 'subsidy_processing', 'completed', 'on_hold', 'cancelled');
CREATE TYPE stage_status_enum AS ENUM ('pending', 'in_progress', 'completed', 'blocked', 'skipped');

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_code VARCHAR(64) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES customer_profiles(id),
    assigned_engineer_id UUID NULL REFERENCES employee_profiles(id),
    capacity_kw NUMERIC(8, 2) NOT NULL,
    system_type VARCHAR(50) NOT NULL,
    panel_make VARCHAR(100),
    inverter_make VARCHAR(100),
    structure_type VARCHAR(100),
    estimated_generation_kwh_year NUMERIC(10, 2),
    total_project_cost NUMERIC(14, 2) NOT NULL,
    subsidy_eligible_amount NUMERIC(14, 2) DEFAULT 0.00,
    customer_payable_amount NUMERIC(14, 2) NOT NULL,
    current_status project_status_enum NOT NULL DEFAULT 'draft',
    current_stage_sequence INT NOT NULL DEFAULT 1,
    target_completion_date DATE,
    actual_commissioning_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    deleted_at TIMESTAMPTZ NULL
);

CREATE TABLE project_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    stage_name VARCHAR(100) NOT NULL,
    stage_code VARCHAR(64) NOT NULL,
    stage_sequence INT NOT NULL,
    stage_status stage_status_enum NOT NULL DEFAULT 'pending',
    assigned_to UUID NULL REFERENCES employee_profiles(id),
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date TIMESTAMPTZ,
    actual_end_date TIMESTAMPTZ,
    remarks TEXT,
    checklist_payload JSONB DEFAULT '{}',
    is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    deleted_at TIMESTAMPTZ NULL,
    CONSTRAINT uq_project_stage UNIQUE(project_id, stage_sequence)
);

CREATE TABLE project_stage_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_stage_id UUID NOT NULL REFERENCES project_stages(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    from_status stage_status_enum NOT NULL,
    to_status stage_status_enum NOT NULL,
    transition_reason TEXT,
    changed_by UUID NOT NULL REFERENCES users(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 4. PAYMENTS & FINANCIALS
-- ============================================================================

CREATE TYPE payment_mode_enum AS ENUM ('upi', 'net_banking', 'credit_card', 'debit_card', 'cheque', 'neft_rtgs', 'loan_disbursement');
CREATE TYPE payment_status_enum AS ENUM ('pending', 'authorized', 'captured', 'failed', 'refunded', 'verified');

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_reference VARCHAR(100) UNIQUE NOT NULL,
    project_id UUID NOT NULL REFERENCES projects(id),
    customer_id UUID NOT NULL REFERENCES customer_profiles(id),
    total_expected_amount NUMERIC(14, 2) NOT NULL,
    total_received_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    outstanding_balance NUMERIC(14, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    deleted_at TIMESTAMPTZ NULL
);

CREATE TABLE payment_installments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    installment_number INT NOT NULL,
    title VARCHAR(100) NOT NULL,
    trigger_stage_code VARCHAR(64),
    due_amount NUMERIC(14, 2) NOT NULL,
    paid_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    due_date DATE NOT NULL,
    payment_mode payment_mode_enum,
    transaction_id VARCHAR(128),
    gateway_signature VARCHAR(255),
    status payment_status_enum NOT NULL DEFAULT 'pending',
    paid_at TIMESTAMPTZ,
    verified_by UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    deleted_at TIMESTAMPTZ NULL,
    CONSTRAINT uq_payment_installment UNIQUE(payment_id, installment_number)
);

CREATE TYPE invoice_type_enum AS ENUM ('proforma', 'tax_invoice', 'milestone_invoice', 'credit_note');

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(64) UNIQUE NOT NULL,
    project_id UUID NOT NULL REFERENCES projects(id),
    customer_id UUID NOT NULL REFERENCES customer_profiles(id),
    installment_id UUID NULL REFERENCES payment_installments(id),
    invoice_type invoice_type_enum NOT NULL DEFAULT 'tax_invoice',
    subtotal_amount NUMERIC(14, 2) NOT NULL,
    cgst_rate NUMERIC(5, 2) DEFAULT 0.00,
    cgst_amount NUMERIC(14, 2) DEFAULT 0.00,
    sgst_rate NUMERIC(5, 2) DEFAULT 0.00,
    sgst_amount NUMERIC(14, 2) DEFAULT 0.00,
    igst_rate NUMERIC(5, 2) DEFAULT 0.00,
    igst_amount NUMERIC(14, 2) DEFAULT 0.00,
    total_amount NUMERIC(14, 2) NOT NULL,
    pdf_document_id UUID,
    issued_date DATE NOT NULL,
    due_date DATE NOT NULL,
    payment_status payment_status_enum NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    deleted_at TIMESTAMPTZ NULL
);

-- ============================================================================
-- 5. OPERATIONS: INSTALLATION, SUBSIDY & WARRANTY
-- ============================================================================

CREATE TYPE installation_status_enum AS ENUM ('scheduled', 'civil_work', 'structure_mounting', 'panel_wiring', 'inverter_setup', 'testing_qa', 'completed', 'inspection_failed');

CREATE TABLE installations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
    lead_technician_id UUID NOT NULL REFERENCES employee_profiles(id),
    status installation_status_enum NOT NULL DEFAULT 'scheduled',
    scheduled_start_date DATE NOT NULL,
    scheduled_completion_date DATE NOT NULL,
    actual_start_date DATE,
    actual_completion_date DATE,
    azimuth_angle NUMERIC(6, 2),
    tilt_angle NUMERIC(6, 2),
    structure_height_meters NUMERIC(6, 2),
    earthing_pits_count INT DEFAULT 2,
    lightning_arrester_installed BOOLEAN DEFAULT TRUE,
    qa_checklist JSONB DEFAULT '{}',
    inspection_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    deleted_at TIMESTAMPTZ NULL
);

CREATE TYPE subsidy_status_enum AS ENUM ('not_applied', 'application_submitted', 'discom_survey_approved', 'portal_registered', 'inspection_completed', 'disbursed', 'rejected');

CREATE TABLE subsidies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
    scheme_name VARCHAR(150) NOT NULL,
    portal_application_number VARCHAR(100) UNIQUE,
    discom_registration_number VARCHAR(100),
    applied_amount NUMERIC(14, 2) NOT NULL,
    approved_amount NUMERIC(14, 2) DEFAULT 0.00,
    disbursed_amount NUMERIC(14, 2) DEFAULT 0.00,
    status subsidy_status_enum NOT NULL DEFAULT 'not_applied',
    submission_date DATE,
    approval_date DATE,
    disbursement_date DATE,
    beneficiary_bank_account JSONB,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    deleted_at TIMESTAMPTZ NULL
);

CREATE TYPE warranty_item_type_enum AS ENUM ('solar_panels', 'solar_inverter', 'mounting_structure', 'generation_guarantee', 'workmanship');

CREATE TABLE warranties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    item_type warranty_item_type_enum NOT NULL,
    oem_manufacturer VARCHAR(150) NOT NULL,
    serial_numbers JSONB NOT NULL DEFAULT '[]',
    coverage_years INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    terms_and_conditions TEXT,
    certificate_document_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    deleted_at TIMESTAMPTZ NULL
);

-- ============================================================================
-- 6. DOCUMENT MANAGEMENT
-- ============================================================================

CREATE TABLE document_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(64) NOT NULL UNIQUE,
    required_for_stage VARCHAR(64),
    allowed_mime_types JSONB NOT NULL DEFAULT '["application/pdf", "image/jpeg", "image/png"]',
    max_file_size_bytes BIGINT NOT NULL DEFAULT 10485760, -- 10MB
    is_mandatory BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    deleted_at TIMESTAMPTZ NULL
);

CREATE TYPE doc_verification_status_enum AS ENUM ('pending_verification', 'verified', 'rejected');

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_type_id UUID NOT NULL REFERENCES document_types(id),
    customer_id UUID NULL REFERENCES customer_profiles(id),
    project_id UUID NULL REFERENCES projects(id),
    project_stage_id UUID NULL REFERENCES project_stages(id),
    file_name VARCHAR(255) NOT NULL,
    s3_bucket VARCHAR(100) NOT NULL,
    s3_key VARCHAR(512) NOT NULL UNIQUE,
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    checksum_sha256 VARCHAR(64) NOT NULL,
    verification_status doc_verification_status_enum NOT NULL DEFAULT 'pending_verification',
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMPTZ,
    rejection_reason TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    deleted_at TIMESTAMPTZ NULL
);

-- ============================================================================
-- 7. NOTIFICATIONS & AUDIT LOGS
-- ============================================================================

CREATE TYPE notification_channel_enum AS ENUM ('in_app', 'sms', 'email', 'whatsapp', 'push');

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    channel notification_channel_enum NOT NULL DEFAULT 'in_app',
    entity_type VARCHAR(64),
    entity_id UUID,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    delivery_status VARCHAR(32) NOT NULL DEFAULT 'pending',
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    actor_user_type VARCHAR(32),
    actor_ip_address VARCHAR(45),
    user_agent TEXT,
    action VARCHAR(64) NOT NULL,
    entity_table VARCHAR(64) NOT NULL,
    entity_id UUID NOT NULL,
    old_values JSONB,
    new_values JSONB,
    diff JSONB,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 8. INDEXES FOR PERFORMANCE & FAST QUERYING
-- ============================================================================

CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_phone ON users(phone_number) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_type_status ON users(user_type, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_user_roles_composite ON user_roles(user_id, role_id);

CREATE INDEX idx_admin_user_id ON admin_profiles(user_id);
CREATE INDEX idx_employee_user_id ON employee_profiles(user_id);
CREATE INDEX idx_employee_admin_id ON employee_profiles(reporting_admin_id);
CREATE INDEX idx_customer_employee_id ON customer_profiles(assigned_employee_id);
CREATE INDEX idx_customer_b2b_org_id ON customer_profiles(b2b_organization_id);

CREATE INDEX idx_projects_customer_id ON projects(customer_id);
CREATE INDEX idx_projects_engineer_id ON projects(assigned_engineer_id);
CREATE INDEX idx_projects_status ON projects(current_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_project_stages_proj_seq ON project_stages(project_id, stage_sequence);
CREATE INDEX idx_project_stages_status ON project_stages(stage_status);
CREATE INDEX idx_stage_history_stage_id ON project_stage_history(project_stage_id);

CREATE INDEX idx_payments_project_id ON payments(project_id);
CREATE INDEX idx_payments_customer_id ON payments(customer_id);
CREATE INDEX idx_installments_payment_id ON payment_installments(payment_id);
CREATE INDEX idx_installments_status ON payment_installments(status);
CREATE INDEX idx_invoices_project_id ON invoices(project_id);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);

CREATE INDEX idx_documents_project_id ON documents(project_id);
CREATE INDEX idx_documents_customer_id ON documents(customer_id);
CREATE INDEX idx_documents_type_id ON documents(document_type_id);
CREATE INDEX idx_documents_s3_key ON documents(s3_key);
CREATE INDEX idx_installations_project_id ON installations(project_id);
CREATE INDEX idx_subsidies_project_id ON subsidies(project_id);
CREATE INDEX idx_warranties_project_id ON warranties(project_id);

CREATE INDEX idx_notifications_recipient_unread ON notifications(recipient_user_id, is_read, created_at DESC);
CREATE INDEX idx_audit_entity ON audit_logs(entity_table, entity_id);
CREATE INDEX idx_audit_actor ON audit_logs(actor_user_id, created_at DESC);
CREATE INDEX idx_audit_action_created ON audit_logs(action, created_at DESC);
