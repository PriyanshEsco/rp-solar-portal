import { db } from '../db';
import { UserType, SessionPayload } from '../types';
import { recordAuditLog } from '../audit';

export type PermissionModule =
  | 'users'
  | 'employees'
  | 'customers'
  | 'projects'
  | 'payments'
  | 'documents'
  | 'installation'
  | 'subsidy'
  | 'reports'
  | 'notifications'
  | 'audit_logs';

export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'manage' | 'verify';

/**
 * Base Permission definitions per role
 */
const ROLE_PERMISSIONS: Record<UserType, Record<PermissionModule, PermissionAction[]>> = {
  super_admin: {
    users: ['create', 'read', 'update', 'delete', 'manage'],
    employees: ['create', 'read', 'update', 'delete', 'manage'],
    customers: ['create', 'read', 'update', 'delete', 'manage'],
    projects: ['create', 'read', 'update', 'delete', 'manage'],
    payments: ['create', 'read', 'update', 'delete', 'verify', 'manage'],
    documents: ['create', 'read', 'update', 'delete', 'verify', 'manage'],
    installation: ['create', 'read', 'update', 'manage'],
    subsidy: ['create', 'read', 'update', 'manage'],
    reports: ['read', 'manage'],
    notifications: ['create', 'read', 'manage'],
    audit_logs: ['read', 'manage'],
  },
  admin: {
    users: ['read'],
    employees: ['create', 'read', 'update', 'manage'], // scoped to their region/managed employees
    customers: ['create', 'read', 'update', 'manage'], // scoped to customers of their employees
    projects: ['create', 'read', 'update', 'manage'],
    payments: ['read', 'verify'],
    documents: ['read', 'verify'],
    installation: ['read', 'update'],
    subsidy: ['read', 'update'],
    reports: ['read'],
    notifications: ['create', 'read'],
    audit_logs: ['read'],
  },
  employee: {
    users: ['read'],
    employees: ['read'], // self / directory
    customers: ['create', 'read', 'update'], // strictly assigned customers only
    projects: ['read', 'update'], // strictly assigned projects only
    payments: ['read', 'create'], // strictly assigned projects only
    documents: ['create', 'read', 'verify'], // strictly assigned
    installation: ['read', 'update'], // assigned installation
    subsidy: ['read', 'update'], // assigned subsidy
    reports: [], // DENIED
    notifications: ['create', 'read'],
    audit_logs: ['read'], // Scoped to assigned projects and own activity
  },
  customer: {
    users: ['read'],
    employees: [],
    customers: ['read', 'update'], // self only
    projects: ['read'], // own projects
    payments: ['read', 'create'], // own payments
    documents: ['create', 'read'], // own documents
    installation: ['read'], // own installation
    subsidy: ['read'], // own subsidy
    reports: [],
    notifications: ['read'],
    audit_logs: [],
  },
};

/**
 * Check if role possesses module action permission
 */
export function hasBasePermission(role: UserType, module: PermissionModule, action: PermissionAction): boolean {
  const perms = ROLE_PERMISSIONS[role]?.[module] || [];
  return perms.includes(action) || perms.includes('manage');
}

/**
 * Get all employee profile IDs managed under an admin profile
 */
export function getAdminManagedEmployeeIds(adminProfileId: string): string[] {
  const ids: string[] = [];
  for (const emp of Array.from(db.employees.values())) {
    if (emp.reportingAdminId === adminProfileId) {
      ids.push(emp.id);
    }
  }
  return ids;
}

/**
 * Get all customer profile IDs managed by an admin's team
 */
export function getAdminManagedCustomerIds(adminProfileId: string): string[] {
  const employeeIds = new Set(getAdminManagedEmployeeIds(adminProfileId));
  const customerIds: string[] = [];
  for (const cust of Array.from(db.customers.values())) {
    if (cust.assignedEmployeeId && employeeIds.has(cust.assignedEmployeeId)) {
      customerIds.push(cust.id);
    }
  }
  return customerIds;
}

/**
 * CRITICAL OWNERSHIP VERIFICATION ENGINE
 * Enforces server-side data isolation and cross-tenant boundary security.
 * Rejects with false when caller is not allowed to touch the specific resource instance.
 */
export function verifyOwnership(
  session: SessionPayload,
  module: PermissionModule,
  resourceId: string
): { allowed: boolean; reason?: string } {
  // 1. Super Admin has unrestricted global access
  if (session.userType === 'super_admin') {
    return { allowed: true };
  }

  // 2. Admin Ownership Scope
  if (session.userType === 'admin') {
    const adminProfileId = session.profileId;
    const managedEmpIds = getAdminManagedEmployeeIds(adminProfileId);
    const managedCustIds = getAdminManagedCustomerIds(adminProfileId);

    switch (module) {
      case 'employees': {
        const emp = db.employees.get(resourceId);
        if (!emp) return { allowed: false, reason: 'Employee record not found' };
        if (emp.reportingAdminId !== adminProfileId) {
          return { allowed: false, reason: `Employee ${emp.employeeCode} is managed by another Admin (${emp.reportingAdminId})` };
        }
        return { allowed: true };
      }

      case 'customers': {
        const cust = db.customers.get(resourceId);
        if (!cust) return { allowed: false, reason: 'Customer record not found' };
        if (!managedCustIds.includes(cust.id)) {
          return { allowed: false, reason: `Customer ${cust.id} is assigned to an employee outside your admin hierarchy` };
        }
        return { allowed: true };
      }

      case 'projects': {
        const proj = db.projects.get(resourceId);
        if (!proj) return { allowed: false, reason: 'Project record not found' };
        if (!managedCustIds.includes(proj.customerId) && !managedEmpIds.includes(proj.assignedEngineerId)) {
          return { allowed: false, reason: `Project ${proj.projectCode} belongs to an unmanaged region/team` };
        }
        return { allowed: true };
      }

      case 'payments': {
        const pay = db.payments.get(resourceId);
        if (!pay) return { allowed: false, reason: 'Payment record not found' };
        if (!managedCustIds.includes(pay.customerId)) {
          return { allowed: false, reason: 'Payment record belongs to another regional scope' };
        }
        return { allowed: true };
      }

      case 'documents': {
        const doc = db.documents.get(resourceId);
        if (!doc) return { allowed: false, reason: 'Document record not found' };
        const proj = doc.projectId ? db.projects.get(doc.projectId) : null;
        if (!managedCustIds.includes(doc.customerId) && (!proj || !managedEmpIds.includes(proj.assignedEngineerId))) {
          return { allowed: false, reason: `Access Denied: Document ${doc.fileName} belongs to an unmanaged customer/project` };
        }
        return { allowed: true };
      }

      case 'installation': {
        const inst = db.installations.get(resourceId);
        if (!inst) return { allowed: false, reason: 'Installation record not found' };
        const proj = db.projects.get(inst.projectId);
        if (!proj || (!managedCustIds.includes(proj.customerId) && (!inst.leadTechnicianId || !managedEmpIds.includes(inst.leadTechnicianId)))) {
          return { allowed: false, reason: 'Installation belongs to another regional scope' };
        }
        return { allowed: true };
      }

      case 'subsidy': {
        const sub = db.subsidies.get(resourceId);
        if (!sub) return { allowed: false, reason: 'Subsidy record not found' };
        const proj = db.projects.get(sub.projectId);
        if (!proj || !managedCustIds.includes(proj.customerId)) {
          return { allowed: false, reason: 'Subsidy record belongs to another regional scope' };
        }
        return { allowed: true };
      }

      case 'reports':
      case 'notifications':
      case 'audit_logs':
        return { allowed: true };

      default:
        return { allowed: false, reason: `Unauthorized module ${module} for admin` };
    }
  }

  // 3. Employee Ownership Scope
  if (session.userType === 'employee') {
    const employeeProfileId = session.profileId;

    switch (module) {
      case 'employees': {
        // Employee can read self profile
        if (resourceId === employeeProfileId) return { allowed: true };
        return { allowed: false, reason: 'Employees cannot inspect other employee profiles' };
      }

      case 'customers': {
        const cust = db.customers.get(resourceId);
        if (!cust) return { allowed: false, reason: 'Customer record not found' };
        if (cust.assignedEmployeeId !== employeeProfileId) {
          return {
            allowed: false,
            reason: `Access Denied: Customer ${cust.firstName} ${cust.lastName} (ID: ${cust.id}) is not assigned to Employee ID ${employeeProfileId}`,
          };
        }
        return { allowed: true };
      }

      case 'projects': {
        const proj = db.projects.get(resourceId);
        if (!proj) return { allowed: false, reason: 'Project record not found' };
        const cust = db.customers.get(proj.customerId);
        if (proj.assignedEngineerId !== employeeProfileId && cust?.assignedEmployeeId !== employeeProfileId) {
          return {
            allowed: false,
            reason: `Access Denied: Project ${proj.projectCode} is assigned to another operations engineer`,
          };
        }
        return { allowed: true };
      }

      case 'payments': {
        const pay = db.payments.get(resourceId);
        if (!pay) return { allowed: false, reason: 'Payment record not found' };
        const cust = db.customers.get(pay.customerId);
        if (cust?.assignedEmployeeId !== employeeProfileId) {
          return { allowed: false, reason: 'Payment belongs to a customer not assigned to you' };
        }
        return { allowed: true };
      }

      case 'documents': {
        const doc = db.documents.get(resourceId);
        if (!doc) return { allowed: false, reason: 'Document record not found' };
        const cust = db.customers.get(doc.customerId);
        const proj = doc.projectId ? db.projects.get(doc.projectId) : null;
        if (cust?.assignedEmployeeId !== employeeProfileId && proj?.assignedEngineerId !== employeeProfileId) {
          return {
            allowed: false,
            reason: `Access Denied: Document ${doc.fileName} belongs to a customer/project not assigned to you`,
          };
        }
        return { allowed: true };
      }

      case 'installation': {
        const inst = db.installations.get(resourceId);
        if (!inst) return { allowed: false, reason: 'Installation record not found' };
        if (inst.leadTechnicianId !== employeeProfileId) {
          return { allowed: false, reason: 'Installation is not assigned to your lead technician profile' };
        }
        return { allowed: true };
      }

      case 'subsidy': {
        const sub = db.subsidies.get(resourceId);
        if (!sub) return { allowed: false, reason: 'Subsidy record not found' };
        const proj = db.projects.get(sub.projectId);
        const cust = proj ? db.customers.get(proj.customerId) : null;
        if (cust?.assignedEmployeeId !== employeeProfileId && proj?.assignedEngineerId !== employeeProfileId) {
          return { allowed: false, reason: 'Subsidy record belongs to another employee assignment' };
        }
        return { allowed: true };
      }

      case 'reports':
        return { allowed: false, reason: 'Employee does not have permission to access management reports' };

      case 'audit_logs':
      case 'notifications':
        return { allowed: true };

      default:
        return { allowed: false, reason: 'Unauthorized action' };
    }
  }

  // 4. Customer Ownership Scope
  if (session.userType === 'customer') {
    const customerProfileId = session.profileId;
    switch (module) {
      case 'customers':
        return resourceId === customerProfileId
          ? { allowed: true }
          : { allowed: false, reason: 'Cannot access other customer data' };
      case 'projects': {
        const proj = db.projects.get(resourceId);
        return proj && proj.customerId === customerProfileId
          ? { allowed: true }
          : { allowed: false, reason: 'Not your project' };
      }
      case 'payments': {
        const pay = db.payments.get(resourceId);
        return pay && pay.customerId === customerProfileId
          ? { allowed: true }
          : { allowed: false, reason: 'Not your payment record' };
      }
      case 'documents': {
        const doc = db.documents.get(resourceId);
        return doc && doc.customerId === customerProfileId
          ? { allowed: true }
          : { allowed: false, reason: 'Not your document' };
      }
      default:
        return { allowed: false, reason: 'Restricted to customer' };
    }
  }

  return { allowed: false, reason: 'Unknown role' };
}

export const checkOwnership = verifyOwnership;

