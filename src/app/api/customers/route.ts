import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { guardApiRequest } from '@/lib/auth/server-guard';
import { db, appCache } from '@/lib/db';
import { getAdminManagedCustomerIds } from '@/lib/auth/rbac';
import { recordAuditLog } from '@/lib/audit';
import { User, CustomerProfile, B2BOrganization, Project, DocumentRecord } from '@/lib/types';

// GET /api/customers - List customers with full B2B/B2C workflow & ownership scoping
export async function GET(req: NextRequest) {
  const guard = await guardApiRequest(req, 'customers', 'read');
  if (!guard.authorized || !guard.session) {
    return guard.response!;
  }

  const { userType, profileId } = guard.session;
  const url = new URL(req.url);
  const typeFilter = url.searchParams.get('type'); // 'all', 'b2b', 'b2c'
  const searchFilter = url.searchParams.get('search')?.toLowerCase();
  const pageParam = url.searchParams.get('page');
  const limitParam = url.searchParams.get('limit') || url.searchParams.get('pageSize');
  const sortBy = url.searchParams.get('sortBy') || 'createdAt';
  const sortOrder = url.searchParams.get('sortOrder') || 'desc';

  let accessibleCustomers: CustomerProfile[] = [];

  if (userType === 'super_admin') {
    accessibleCustomers = Array.from(db.customers.values());
  } else if (userType === 'admin') {
    const managedCustIds = new Set(getAdminManagedCustomerIds(profileId));
    accessibleCustomers = Array.from(db.customers.values()).filter((c) => managedCustIds.has(c.id));
  } else if (userType === 'employee') {
    accessibleCustomers = db.getCustomersForEmployee(profileId);
    if (accessibleCustomers.length === 0) {
      accessibleCustomers = Array.from(db.customers.values()).filter((c) => c.assignedEmployeeId === profileId);
    }
  } else if (userType === 'customer') {
    const self = db.customers.get(profileId);
    if (self) accessibleCustomers = [self];
  }

  // Enrich customer records with linked org, employee, admin, and project details using O(1) indexed lookups
  let enriched = accessibleCustomers.map((cust) => {
    const emp = db.employees.get(cust.assignedEmployeeId);
    const admin = emp ? db.admins.get(emp.reportingAdminId) : null;
    const org = cust.b2bOrganizationId ? db.organizations.get(cust.b2bOrganizationId) : null;
    const projects = db.getProjectsForCustomer(cust.id);
    const totalKw = projects.reduce((acc, p) => acc + (p.capacityKw || 0), 0) || cust.proposedCapacityKw || 0;

    const isB2B = cust.customerType === 'commercial' || cust.customerType === 'industrial';

    return {
      id: cust.id,
      userId: cust.userId,
      customerType: cust.customerType,
      isB2B,
      categoryLabel: isB2B ? 'B2B Commercial' : 'B2C Residential',
      name: `${cust.firstName} ${cust.lastName}`.trim(),
      firstName: cust.firstName,
      lastName: cust.lastName,
      phoneNumber: cust.phoneNumber,
      alternateMobile: cust.alternateMobile,
      email: cust.email,
      electricityConsumerNumber: cust.electricityConsumerNumber,
      discomName: cust.discomName,
      installationAddress: cust.installationAddress,
      district: cust.district,
      city: cust.city,
      state: cust.state,
      pincode: cust.pincode,
      sanctionedLoadKw: cust.sanctionedLoadKw,
      proposedCapacityKw: cust.proposedCapacityKw,
      workflow: cust.workflow || null,
      organization: org || null,
      assignedEmployee: emp
        ? {
            id: emp.id,
            name: `${emp.firstName} ${emp.lastName}`,
            code: emp.employeeCode,
            department: emp.department,
            region: emp.assignedRegion,
          }
        : null,
      assignedAdmin: admin
        ? {
            id: admin.id,
            name: `${admin.firstName} ${admin.lastName}`,
            region: admin.branchRegion,
          }
        : null,
      projectsCount: projects.length,
      totalCapacityKw: totalKw,
      projects,
      createdAt: cust.createdAt,
    };
  });

  // Filter by Type
  if (typeFilter === 'b2b') {
    enriched = enriched.filter((c) => c.isB2B);
  } else if (typeFilter === 'b2c') {
    enriched = enriched.filter((c) => !c.isB2B);
  }

  // Filter by Search query
  if (searchFilter) {
    enriched = enriched.filter(
      (c) =>
        c.name.toLowerCase().includes(searchFilter) ||
        c.email.toLowerCase().includes(searchFilter) ||
        c.phoneNumber.toLowerCase().includes(searchFilter) ||
        c.electricityConsumerNumber.toLowerCase().includes(searchFilter) ||
        c.organization?.orgName.toLowerCase().includes(searchFilter) ||
        c.city.toLowerCase().includes(searchFilter)
    );
  }

  // Sorting
  enriched.sort((a, b) => {
    let comp = 0;
    if (sortBy === 'name') comp = a.name.localeCompare(b.name);
    else if (sortBy === 'capacity') comp = (a.totalCapacityKw || 0) - (b.totalCapacityKw || 0);
    else comp = new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    return sortOrder === 'asc' ? comp : -comp;
  });

  // Server-side Pagination
  const total = enriched.length;
  const page = Math.max(1, parseInt(pageParam || '1', 10));
  const limit = limitParam === 'all' ? total : Math.max(1, parseInt(limitParam || '50', 10));
  const totalPages = Math.ceil(total / limit) || 1;
  const paginatedData = limitParam === 'all' ? enriched : enriched.slice((page - 1) * limit, page * limit);

  return NextResponse.json({
    success: true,
    data: paginatedData,
    pagination: {
      total,
      page,
      limit,
      totalPages,
    },
    meta: {
      count: paginatedData.length,
      total,
      scope: userType,
    },
  });
}

// POST /api/customers - Onboard B2C or B2B Customer
export async function POST(req: NextRequest) {
  const guard = await guardApiRequest(req, 'customers', 'create');
  if (!guard.authorized || !guard.session) {
    return guard.response!;
  }

  try {
    const body = await req.json();
    const rawMode = body.customerMode || body.customerType || '';
    const customerMode = rawMode.trim().toLowerCase(); // 'b2c' | 'b2b'

    if (!['b2c', 'b2b'].includes(customerMode)) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_TYPE', message: 'Customer mode must be either "B2C" or "B2B".' } },
        { status: 400 }
      );
    }

    const callerType = guard.session.userType;
    const callerProfileId = guard.session.profileId;

    // Resolve assigned employee and admin based on caller hierarchy
    let assignedEmployeeId = body.assignedEmployeeId || body.employeeId || body.assignedEmployee;
    let assignedAdminId = body.assignedAdminId || body.adminId || body.assignedAdmin;

    if (callerType === 'employee') {
      assignedEmployeeId = callerProfileId;
      const emp = db.employees.get(callerProfileId);
      assignedAdminId = emp?.reportingAdminId || 'admin-prof-north';
    } else if (callerType === 'admin') {
      assignedAdminId = callerProfileId;
      if (!assignedEmployeeId) {
        // pick first employee of this admin
        const firstEmp = Array.from(db.employees.values()).find((e) => e.reportingAdminId === callerProfileId);
        assignedEmployeeId = firstEmp?.id || 'emp-prof-rahul';
      }
    } else {
      // Super Admin default
      if (!assignedEmployeeId) assignedEmployeeId = 'emp-prof-rahul';
      const emp = db.employees.get(assignedEmployeeId);
      assignedAdminId = assignedAdminId || emp?.reportingAdminId || 'admin-prof-north';
    }

    // ------------------------------------------------------------------------
    // CASE 1: B2C CUSTOMER ONBOARDING
    // ------------------------------------------------------------------------
    if (customerMode === 'b2c') {
      let firstName = body.firstName;
      let lastName = body.lastName;
      if (!firstName && body.name) {
        const parts = body.name.trim().split(' ');
        firstName = parts[0];
        lastName = parts.slice(1).join(' ') || 'Customer';
      }
      if (!lastName) lastName = 'Customer';

      const mobileNumber = body.mobileNumber || body.mobile || body.phone;
      const alternateMobile = body.alternateMobile || body.altMobile;
      const email = body.email;
      const address = body.address || body.installationAddress || 'Main Residential Site';
      const district = body.district || 'Central District';
      const state = body.state || 'Gujarat';
      const pincode = body.pincode || '380001';
      const existingLoadKw = Number(body.existingLoadKw ?? body.existingLoad ?? 5.0);
      const solarInstallationCapacityKw = Number(body.solarInstallationCapacityKw ?? body.solarCapacityKw ?? body.solarCapacity ?? 5.0);
      
      const discomApplicationType = body.discomApplicationType || (body.workflow?.brownFile?.required ? 'brown_file' : 'new_connection');
      const paymentMode = body.paymentMode || (body.workflow?.paymentMode ? body.workflow.paymentMode.toLowerCase() : 'jan_samarth_loan');
      const workOrderStatus = body.workOrderStatus || (body.workflow?.workOrder?.status ? body.workflow.workOrder.status.toLowerCase() : 'issued');
      const mnreRegistrationStatus = body.mnreRegistrationStatus || (body.workflow?.mnreRegistration?.status ? body.workflow.mnreRegistration.status.toLowerCase() : 'registered');
      const tfrStatus = body.tfrStatus || (body.workflow?.tfr?.status ? body.workflow.tfr.status.toLowerCase() : 'approved');
      const discomName = body.discomName || 'State Electricity DISCOM';
      const electricityConsumerNumber = body.electricityConsumerNumber;

      if (!firstName || !mobileNumber || !email) {
        return NextResponse.json(
          { success: false, error: { code: 'INVALID_INPUT', message: 'Customer name, mobile number, and email are required.' } },
          { status: 400 }
        );
      }

      const normalizedEmail = email.trim().toLowerCase();
      const userId = `usr-cust-${crypto.randomBytes(4).toString('hex')}`;
      const customerProfileId = `cust-prof-${crypto.randomBytes(4).toString('hex')}`;
      const consumerNo = electricityConsumerNumber || `DISCOM-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

      // Create User
      const newUser: User = {
        id: userId,
        email: normalizedEmail,
        username: normalizedEmail.split('@')[0],
        phoneNumber: mobileNumber,
        passwordHash: bcrypt.hashSync('Password123!', 10),
        userType: 'customer',
        status: 'active',
        joiningDate: new Date().toISOString().split('T')[0],
        failedLoginAttempts: 0,
        lockoutUntil: null,
        lastLoginAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      db.users.set(userId, newUser);

      // Create Customer Profile
      const newCust: CustomerProfile = {
        id: customerProfileId,
        userId,
        assignedEmployeeId,
        customerType: 'residential',
        firstName,
        lastName,
        phoneNumber: mobileNumber,
        alternateMobile,
        email: normalizedEmail,
        electricityConsumerNumber: consumerNo,
        discomName,
        installationAddress: address,
        district,
        city: district,
        state,
        pincode,
        sanctionedLoadKw: existingLoadKw,
        proposedCapacityKw: solarInstallationCapacityKw,
        workflow: {
          discomApplicationType,
          paymentMode,
          workOrderStatus,
          mnreRegistrationStatus,
          tfrStatus,
          existingLoadKw,
          proposedSolarCapacityKw: solarInstallationCapacityKw,
          ...(body.workflow || {}),
        },
        createdAt: new Date().toISOString(),
      };
      db.customers.set(customerProfileId, newCust);

      // Create Initial Project
      const projectCode = `RPS-2026-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      const projId = `proj-${crypto.randomBytes(4).toString('hex')}`;
      const newProject: Project = {
        id: projId,
        projectCode,
        projectName: `${firstName} ${lastName} ${solarInstallationCapacityKw}kW Rooftop Solar`,
        customerId: customerProfileId,
        assignedEngineerId: assignedEmployeeId,
        capacityKw: solarInstallationCapacityKw,
        systemType: 'on_grid',
        totalCost: solarInstallationCapacityKw * 60000,
        priority: 'standard',
        status: 'feasibility_survey',
        currentStage: 'Site Survey & DISCOM NOC',
        remarks: `B2C Rooftop (${discomApplicationType.replace('_', ' ')}). Payment: ${paymentMode.replace('_', ' ')}.`,
        createdAt: new Date().toISOString(),
      };
      db.projects.set(projId, newProject);

      // Index and invalidate cache
      db.indexCustomer(newCust);
      db.indexProject(newProject);
      appCache.invalidateTags('dashboard', 'customers', 'projects');

      recordAuditLog({
        actorUserId: guard.session.userId,
        actorEmail: guard.session.email,
        actorUserType: guard.session.userType,
        action: 'B2C_CUSTOMER_ONBOARDED',
        entityTable: 'customers',
        entityId: customerProfileId,
        details: `Onboarded B2C Customer ${firstName} ${lastName} (${solarInstallationCapacityKw} kW)`,
        status: 'SUCCESS',
      });

      return NextResponse.json({
        success: true,
        message: `B2C Customer ${firstName} ${lastName} onboarded with Project ${projectCode}.`,
        data: {
          customer: newCust,
          project: newProject,
        },
      });
    }

    // ------------------------------------------------------------------------
    // CASE 2: B2B CUSTOMER ONBOARDING (Project-Oriented)
    // ------------------------------------------------------------------------
    if (customerMode === 'b2b') {
      const orgName = body.organizationName || body.orgName;
      const contactPerson = body.contactPerson || body.name;
      const designation = body.designation || 'Director';
      const mobile = body.mobile || body.mobileNumber || body.phone;
      const email = body.email;
      const billingAddress = body.billingAddress || body.address || 'Industrial Area';
      const installationAddress = body.installationAddress || body.siteAddress || billingAddress;
      const district = body.district || 'Mehsana';
      const state = body.state || 'Gujarat';
      const pincode = body.pincode || '384002';
      const gstin = body.gstin || body.gst || '24AABCS1429B1Z8';
      const pan = body.pan || body.panNumber || 'AABCS1429B';

      const projectData = body.project || {};
      const projectName = projectData.projectName || body.projectName || `${orgName} Rooftop Solar Project`;
      const solarCapacityKw = Number(projectData.capacityKw ?? projectData.solarCapacity ?? body.solarCapacityKw ?? body.solarCapacity ?? 25.0);
      const expectedCompletionDate = projectData.expectedCompletionDate || projectData.expectedCompletion || body.expectedCompletionDate || body.expectedCompletion || new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0];
      const projectStatus = projectData.projectStatus || projectData.status || body.projectStatus || body.status || 'draft';
      const priority = (projectData.priority || body.priority || 'high').toLowerCase();
      const remarks = projectData.remarks || body.remarks || 'B2B commercial installation';

      const rawDocs = body.documents || body.documentsAttached || [];
      const documentsAttached = Array.isArray(rawDocs)
        ? rawDocs
        : Object.keys(rawDocs).filter((k) => !!rawDocs[k]);

      if (!orgName || !contactPerson || !mobile || !email) {
        return NextResponse.json(
          { success: false, error: { code: 'INVALID_INPUT', message: 'Organization name, contact person, mobile, and email are required.' } },
          { status: 400 }
        );
      }

      const orgId = `org-${crypto.randomBytes(4).toString('hex')}`;
      const userId = `usr-cust-${crypto.randomBytes(4).toString('hex')}`;
      const customerProfileId = `cust-prof-${crypto.randomBytes(4).toString('hex')}`;
      const normalizedEmail = email.trim().toLowerCase();

      // Split contact name
      const nameParts = contactPerson.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || 'Admin';

      // 1. Create B2B Organization Record
      const newOrg: B2BOrganization = {
        id: orgId,
        orgName,
        gstin: gstin || '29AAAAA0000A1Z5',
        pan: pan || 'AAAAA0000A',
        contactPerson,
        designation,
        contactEmail: normalizedEmail,
        contactMobile: mobile,
        billingAddress: billingAddress || installationAddress || 'Industrial Area',
        district: district || 'Industrial District',
        state: state || 'Karnataka',
        pincode: pincode || '560001',
        createdAt: new Date().toISOString(),
      };
      db.organizations.set(orgId, newOrg);

      // 2. Create User Account
      const newUser: User = {
        id: userId,
        email: normalizedEmail,
        username: normalizedEmail.split('@')[0],
        phoneNumber: mobile,
        passwordHash: bcrypt.hashSync('Password123!', 10),
        userType: 'customer',
        status: 'active',
        joiningDate: new Date().toISOString().split('T')[0],
        failedLoginAttempts: 0,
        lockoutUntil: null,
        lastLoginAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      db.users.set(userId, newUser);

      // 3. Create Customer Profile linked to Organization
      const newCust: CustomerProfile = {
        id: customerProfileId,
        userId,
        assignedEmployeeId,
        b2bOrganizationId: orgId,
        customerType: 'commercial',
        firstName,
        lastName,
        phoneNumber: mobile,
        email: normalizedEmail,
        electricityConsumerNumber: `HT-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
        discomName: 'Commercial High Tension (HT) DISCOM',
        installationAddress: installationAddress || billingAddress || 'Factory Site',
        district: district || 'Industrial District',
        city: district || 'Bangalore',
        state: state || 'Karnataka',
        pincode: pincode || '560001',
        sanctionedLoadKw: Number(solarCapacityKw) * 1.5,
        proposedCapacityKw: Number(solarCapacityKw),
        createdAt: new Date().toISOString(),
      };
      db.customers.set(customerProfileId, newCust);

      // 4. Create Project-Oriented Record
      const projectCode = `RPS-2026-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      const projId = `proj-${crypto.randomBytes(4).toString('hex')}`;
      const newProject: Project = {
        id: projId,
        projectCode,
        projectName: projectName || `${orgName} ${solarCapacityKw}kW Industrial Rooftop`,
        customerId: customerProfileId,
        b2bOrganizationId: orgId,
        assignedEngineerId: assignedEmployeeId,
        capacityKw: Number(solarCapacityKw),
        systemType: 'hybrid',
        totalCost: Number(solarCapacityKw) * 55000,
        priority: priority || 'high',
        status: projectStatus || 'feasibility_survey',
        currentStage: 'Structural Stability & SLD Approval',
        remarks: remarks || 'Commercial contract with multi-tier milestones.',
        targetCompletionDate: expectedCompletionDate || '2026-06-30',
        createdAt: new Date().toISOString(),
      };
      db.projects.set(projId, newProject);

      // 5. Attach Initial Document Categories (GST, PAN, Agreement, Site Docs, Technical SLD, Other)
      const docCategories = ['gst', 'pan', 'agreement', 'site_docs', 'technical_sld'];
      for (const cat of docCategories) {
        const docId = `doc-${crypto.randomBytes(4).toString('hex')}`;
        db.documents.set(docId, {
          id: docId,
          projectId: projId,
          customerId: customerProfileId,
          docTypeName: `${orgName} - ${cat.toUpperCase()} Record`,
          fileName: `${orgName.toLowerCase().replace(/\s+/g, '_')}_${cat}.pdf`,
          category: cat as any,
          verificationStatus: 'pending_verification',
          uploadedAt: new Date().toISOString(),
        });
      }

      // Index and invalidate cache
      db.indexCustomer(newCust);
      db.indexProject(newProject);
      appCache.invalidateTags('dashboard', 'customers', 'projects', 'documents');

      recordAuditLog({
        actorUserId: guard.session.userId,
        actorEmail: guard.session.email,
        actorUserType: guard.session.userType,
        action: 'B2B_CUSTOMER_ONBOARDED',
        entityTable: 'customers',
        entityId: customerProfileId,
        details: `Onboarded B2B Org ${orgName} with ${solarCapacityKw}kW Project (${projectCode})`,
        status: 'SUCCESS',
      });

      return NextResponse.json({
        success: true,
        message: `B2B Organization ${orgName} onboarded with Project ${projectCode}.`,
        data: {
          organization: newOrg,
          customer: newCust,
          project: newProject,
        },
      });
    }

    return NextResponse.json(
      { success: false, error: { code: 'INVALID_TYPE', message: 'Customer mode must be either "b2c" or "b2b".' } },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
