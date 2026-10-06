import crypto from 'crypto';
import { db } from './db';
import { AuditLogEntry, NotificationType, UserType } from './types';

export interface RecordAuditParams {
  actorUserId?: string | null;
  actorName?: string;
  actorEmail?: string | null;
  actorUserType?: UserType | string | null;
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
  notify?: {
    type: NotificationType;
    title: string;
    message: string;
    recipientUserId?: string;
    recipientRole?: 'super_admin' | 'admin' | 'employee' | 'customer' | 'all';
    link?: string;
  };
}

export function formatAuditTimestamp(date: Date = new Date()): string {
  const day = String(date.getDate()).padStart(2, '0');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 12 instead of 0

  return `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
}

export function recordAuditLog(params: RecordAuditParams): AuditLogEntry {
  const now = new Date();
  const entry: AuditLogEntry = {
    id: `aud-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
    actorUserId: params.actorUserId ?? null,
    actorName: params.actorName ?? (params.actorEmail ? params.actorEmail.split('@')[0] : 'System'),
    actorEmail: params.actorEmail ?? null,
    actorUserType: params.actorUserType ?? null,
    actorRole: params.actorRole ?? (params.actorUserType ? String(params.actorUserType).replace('_', ' ') : 'System Engine'),
    actorIp: params.actorIp ?? '127.0.0.1',
    userAgent: params.userAgent ?? 'Mozilla/5.0 (Enterprise RP Portal)',
    action: params.action,
    module: params.module ?? params.entityTable,
    entityTable: params.entityTable,
    entityId: params.entityId,
    recordIdentifier: params.recordIdentifier ?? params.entityId,
    previousValue: params.previousValue,
    newValue: params.newValue,
    details: params.details,
    status: params.status,
    timestamp: params.timestamp ?? formatAuditTimestamp(now),
    createdAt: now.toISOString(),
  };

  db.auditLogs.unshift(entry); // newest first

  // Auto trigger notification if requested
  if (params.notify) {
    db.createNotification({
      type: params.notify.type,
      title: params.notify.title,
      message: params.notify.message,
      recipientUserId: params.notify.recipientUserId,
      recipientRole: params.notify.recipientRole ?? 'all',
      entityType: params.module as any,
      entityId: params.entityId,
      link: params.notify.link,
      isRead: false,
    });
  }

  return entry;
}

export interface AuditQueryFilter {
  module?: string;
  action?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  userId?: string;
  limit?: number;
}

export function getAuditLogs(
  limit: number = 100,
  filter?: AuditQueryFilter,
  scope?: {
    role: string;
    profileId?: string;
    userId?: string;
    managedEmployeeIds?: string[];
  }
): AuditLogEntry[] {
  let list = db.auditLogs;

  // 1. Role-based Scoping
  if (scope) {
    if (scope.role === 'super_admin') {
      // Super Admin: View all logs across entire enterprise
    } else if (scope.role === 'admin') {
      // Admin: View logs for their team (actions by managed employees, or entities belonging to team)
      const managedIds = new Set(scope.managedEmployeeIds || []);
      list = list.filter((log) => {
        if (log.actorUserId === scope.userId) return true;
        // Check if actor is managed employee
        if (log.actorUserId) {
          const emp = Array.from(db.employees.values()).find((e) => e.userId === log.actorUserId);
          if (emp && managedIds.has(emp.id)) return true;
        }
        // Check if target entity belongs to admin's employees/customers
        if (log.entityTable === 'projects' || log.module === 'projects') {
          const proj = db.projects.get(log.entityId);
          if (proj && managedIds.has(proj.assignedEngineerId)) return true;
        }
        if (log.entityTable === 'customers' || log.module === 'customers') {
          const cust = db.customers.get(log.entityId);
          if (cust && managedIds.has(cust.assignedEmployeeId)) return true;
        }
        return false;
      });
    } else if (scope.role === 'employee') {
      // Employee: View relevant records and own activity
      list = list.filter((log) => {
        if (log.actorUserId === scope.userId) return true;
        if (scope.profileId) {
          if (log.entityTable === 'projects' || log.module === 'projects') {
            const proj = db.projects.get(log.entityId);
            if (proj && proj.assignedEngineerId === scope.profileId) return true;
          }
          if (log.entityTable === 'customers' || log.module === 'customers') {
            const cust = db.customers.get(log.entityId);
            if (cust && cust.assignedEmployeeId === scope.profileId) return true;
          }
        }
        return false;
      });
    }
  }

  // 2. Query Filtering
  if (filter) {
    if (filter.module && filter.module !== 'all') {
      list = list.filter((l) => l.module?.toLowerCase() === filter.module?.toLowerCase() || l.entityTable.toLowerCase() === filter.module?.toLowerCase());
    }
    if (filter.action && filter.action !== 'all') {
      list = list.filter((l) => l.action.toLowerCase() === filter.action?.toLowerCase());
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(
        (l) =>
          l.action.toLowerCase().includes(q) ||
          l.details.toLowerCase().includes(q) ||
          (l.recordIdentifier && l.recordIdentifier.toLowerCase().includes(q)) ||
          (l.actorName && l.actorName.toLowerCase().includes(q)) ||
          (l.actorEmail && l.actorEmail.toLowerCase().includes(q)) ||
          (l.previousValue && l.previousValue.toLowerCase().includes(q)) ||
          (l.newValue && l.newValue.toLowerCase().includes(q))
      );
    }
    if (filter.startDate) {
      const start = new Date(filter.startDate).getTime();
      list = list.filter((l) => new Date(l.createdAt).getTime() >= start);
    }
    if (filter.endDate) {
      const end = new Date(filter.endDate).getTime() + 86400000;
      list = list.filter((l) => new Date(l.createdAt).getTime() <= end);
    }
  }

  return list.slice(0, filter?.limit || limit);
}

