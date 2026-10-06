import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/auth/server-guard';
import { db } from '@/lib/db';
import { getAdminManagedEmployeeIds } from '@/lib/auth/rbac';

export async function GET(req: NextRequest) {
  const guard = await guardApiRequest(req, 'projects', 'read');
  if (!guard.authorized || !guard.session) {
    return guard.response!;
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim().toLowerCase();
  const limitPerGroup = parseInt(searchParams.get('limit') || '8', 10);

  if (!q || q.length < 2) {
    return NextResponse.json({
      success: true,
      query: q,
      results: { customers: [], projects: [], payments: [], documents: [] },
      meta: { totalMatches: 0 },
    });
  }

  const { session } = guard;
  let managedEmployeeIds: Set<string> | null = null;
  if (session.userType === 'admin') {
    managedEmployeeIds = new Set(getAdminManagedEmployeeIds(session.profileId));
  }

  // 1. Search Customers
  let customerList = Array.from(db.customers.values());
  if (session.userType === 'admin' && managedEmployeeIds) {
    customerList = customerList.filter(
      (c) => c.assignedEmployeeId && managedEmployeeIds!.has(c.assignedEmployeeId)
    );
  } else if (session.userType === 'employee') {
    customerList = customerList.filter((c) => c.assignedEmployeeId === session.profileId);
  } else if (session.userType === 'customer') {
    customerList = customerList.filter((c) => c.id === session.profileId);
  }

  const matchedCustomers = customerList
    .filter((c) => {
      const fullName = `${c.firstName || ''} ${c.lastName || ''}`.toLowerCase();
      const code = (c.id || '').toLowerCase();
      const phone = (c.phoneNumber || '').toLowerCase();
      const altPhone = (c.alternateMobile || '').toLowerCase();
      const district = (c.district || c.city || '').toLowerCase();
      const consumerNo = (c.electricityConsumerNumber || '').toLowerCase();
      const org = c.b2bOrganizationId ? db.organizations.get(c.b2bOrganizationId) : null;
      const orgName = (org?.orgName || '').toLowerCase();

      return (
        fullName.includes(q) ||
        code.includes(q) ||
        phone.includes(q) ||
        altPhone.includes(q) ||
        district.includes(q) ||
        consumerNo.includes(q) ||
        orgName.includes(q)
      );
    })
    .slice(0, limitPerGroup)
    .map((c) => {
      const emp = c.assignedEmployeeId ? db.employees.get(c.assignedEmployeeId) : null;
      const org = c.b2bOrganizationId ? db.organizations.get(c.b2bOrganizationId) : null;
      return {
        id: c.id,
        name: org ? `${org.orgName} (${c.firstName} ${c.lastName})` : `${c.firstName} ${c.lastName}`,
        code: c.id,
        phone: c.phoneNumber,
        district: c.district || c.city || 'Delhi/NCR',
        type: c.customerType,
        capacityKw: c.proposedCapacityKw || 5.0,
        employeeName: emp ? `${emp.firstName} ${emp.lastName}` : 'Unassigned',
        link: `/customers`,
      };
    });

  // 2. Search Projects
  let projectList = Array.from(db.projects.values());
  if (session.userType === 'admin' && managedEmployeeIds) {
    projectList = projectList.filter(
      (p) => p.assignedEngineerId && managedEmployeeIds!.has(p.assignedEngineerId)
    );
  } else if (session.userType === 'employee') {
    projectList = projectList.filter((p) => p.assignedEngineerId === session.profileId);
  } else if (session.userType === 'customer') {
    projectList = projectList.filter((p) => p.customerId === session.profileId);
  }

  const matchedProjects = projectList
    .filter((p) => {
      const code = (p.projectCode || p.id).toLowerCase();
      const cust = db.customers.get(p.customerId);
      const custName = cust ? `${cust.firstName || ''} ${cust.lastName || ''}`.toLowerCase() : '';
      const district = cust ? (cust.district || cust.city || '').toLowerCase() : '';
      const emp = p.assignedEngineerId ? db.employees.get(p.assignedEngineerId) : null;
      const empName = emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase() : '';
      const stage = (p.currentStage || '').toLowerCase();
      const status = (p.status || '').toLowerCase();

      return (
        code.includes(q) ||
        custName.includes(q) ||
        district.includes(q) ||
        empName.includes(q) ||
        stage.includes(q) ||
        status.includes(q)
      );
    })
    .slice(0, limitPerGroup)
    .map((p) => {
      const cust = db.customers.get(p.customerId);
      const emp = p.assignedEngineerId ? db.employees.get(p.assignedEngineerId) : null;
      return {
        id: p.id,
        code: p.projectCode,
        customerName: cust ? `${cust.firstName} ${cust.lastName}` : 'Direct Customer',
        district: cust?.district || 'Delhi/NCR',
        capacityKw: p.capacityKw,
        currentStage: p.currentStage,
        status: p.status,
        employeeName: emp ? `${emp.firstName} ${emp.lastName}` : 'Assigned Engineer',
        link: `/projects/${p.id}`,
      };
    });

  // 3. Search Payments & Invoices
  let paymentList = Array.from(db.payments.values());
  const matchedPayments = paymentList
    .filter((pay) => {
      const proj = db.projects.get(pay.projectId);
      const cust = db.customers.get(pay.customerId);

      // RBAC check
      if (session.userType === 'admin' && managedEmployeeIds) {
        if (cust && !managedEmployeeIds.has(cust.assignedEmployeeId || '')) return false;
      } else if (session.userType === 'employee') {
        if (cust && cust.assignedEmployeeId !== session.profileId) return false;
      } else if (session.userType === 'customer') {
        if (pay.customerId !== session.profileId) return false;
      }

      const custName = cust ? `${cust.firstName || ''} ${cust.lastName || ''}`.toLowerCase() : '';
      const projCode = proj ? proj.projectCode.toLowerCase() : '';
      const status = (pay.status || '').toLowerCase();

      // Check transactions
      const txMatch = pay.transactions?.some((t) =>
        t.referenceNumber.toLowerCase().includes(q) ||
        t.receiptNumber.toLowerCase().includes(q) ||
        (t.paymentMode && t.paymentMode.toLowerCase().includes(q))
      );

      // Check installments
      const instMatch = pay.installments?.some((i) =>
        (i.referenceNumber && i.referenceNumber.toLowerCase().includes(q)) ||
        i.title.toLowerCase().includes(q)
      );

      return (
        custName.includes(q) ||
        projCode.includes(q) ||
        status.includes(q) ||
        txMatch ||
        instMatch
      );
    })
    .slice(0, limitPerGroup)
    .map((pay) => {
      const proj = db.projects.get(pay.projectId);
      const cust = db.customers.get(pay.customerId);
      const inv = Array.from(db.invoices.values()).find((i) => i.projectId === pay.projectId);
      return {
        id: pay.id,
        projectCode: proj?.projectCode || 'Solar Project',
        customerName: cust ? `${cust.firstName} ${cust.lastName}` : 'Customer Account',
        totalAmount: pay.totalAmount,
        paidAmount: pay.paidAmount,
        status: pay.status,
        invoiceNumber: inv?.invoiceNumber || `INV-${pay.id.substring(4, 9)}`,
        link: `/payments`,
      };
    });

  // 4. Search Documents & Application Numbers
  let docList = Array.from(db.documents.values());
  const matchedDocs = docList
    .filter((doc) => {
      const cust = db.customers.get(doc.customerId);
      const proj = doc.projectId ? db.projects.get(doc.projectId) : null;
      const sub = proj ? db.subsidies.get(proj.id) || Array.from(db.subsidies.values()).find((s) => s.projectId === proj.id) : null;

      // RBAC check
      if (session.userType === 'admin' && managedEmployeeIds) {
        if (cust && !managedEmployeeIds.has(cust.assignedEmployeeId || '')) return false;
      } else if (session.userType === 'employee') {
        if (cust && cust.assignedEmployeeId !== session.profileId) return false;
      } else if (session.userType === 'customer') {
        if (doc.customerId !== session.profileId) return false;
      }

      const fileName = (doc.fileName || '').toLowerCase();
      const docType = (doc.docTypeName || doc.docTypeCode || '').toLowerCase();
      const custName = cust ? `${cust.firstName || ''} ${cust.lastName || ''}`.toLowerCase() : '';
      const projCode = proj ? proj.projectCode.toLowerCase() : '';
      const appNo = sub?.applicationNumber?.toLowerCase() || '';

      return (
        fileName.includes(q) ||
        docType.includes(q) ||
        custName.includes(q) ||
        projCode.includes(q) ||
        appNo.includes(q)
      );
    })
    .slice(0, limitPerGroup)
    .map((doc) => {
      const cust = db.customers.get(doc.customerId);
      const proj = doc.projectId ? db.projects.get(doc.projectId) : null;
      return {
        id: doc.id,
        fileName: doc.fileName,
        documentType: doc.docTypeName || doc.docTypeCode || 'Document',
        customerName: cust ? `${cust.firstName} ${cust.lastName}` : 'Customer',
        projectCode: proj?.projectCode || '',
        verificationStatus: doc.verificationStatus,
        link: `/documents`,
      };
    });

  const totalMatches =
    matchedCustomers.length + matchedProjects.length + matchedPayments.length + matchedDocs.length;

  return NextResponse.json({
    success: true,
    query: q,
    results: {
      customers: matchedCustomers,
      projects: matchedProjects,
      payments: matchedPayments,
      documents: matchedDocs,
    },
    data: {
      customers: matchedCustomers,
      projects: matchedProjects,
      payments: matchedPayments,
      documents: matchedDocs,
    },
    meta: {
      totalMatches,
      customersCount: matchedCustomers.length,
      projectsCount: matchedProjects.length,
      paymentsCount: matchedPayments.length,
      documentsCount: matchedDocs.length,
    },
  });
}
