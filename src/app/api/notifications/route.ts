import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/auth/server-guard';
import { db } from '@/lib/db';
import { NotificationType } from '@/lib/types';
import { recordAuditLog } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const guard = await guardApiRequest(req, 'notifications', 'read');
  if (!guard.authorized || !guard.session) {
    return guard.response!;
  }

  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get('unreadOnly') === 'true';
  const type = searchParams.get('type') || undefined;
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  const notifications = db.getNotifications({
    userId: guard.session.userId,
    role: guard.session.userType,
    unreadOnly,
    type,
    limit,
  });

  const allUserNotifications = db.getNotifications({
    userId: guard.session.userId,
    role: guard.session.userType,
  });
  const unreadCount = allUserNotifications.filter((n) => !n.isRead).length;

  return NextResponse.json({
    success: true,
    data: notifications,
    meta: {
      total: notifications.length,
      unreadCount,
      role: guard.session.userType,
      userId: guard.session.userId,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const guard = await guardApiRequest(req, 'notifications', 'read');
  if (!guard.authorized || !guard.session) {
    return guard.response!;
  }

  try {
    const body = await req.json();
    const { action, notificationId } = body;

    if (action === 'mark_all_read') {
      db.markAllNotificationsAsRead(guard.session.userId);
      return NextResponse.json({
        success: true,
        message: 'All notifications marked as read',
      });
    }

    if (action === 'mark_read' && notificationId) {
      const updated = db.markNotificationAsRead(notificationId);
      return NextResponse.json({
        success: updated,
        message: updated ? 'Notification marked as read' : 'Notification not found',
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action or missing notificationId' },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to update notification' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const guard = await guardApiRequest(req, 'notifications', 'create');
  if (!guard.authorized || !guard.session) {
    return guard.response!;
  }

  try {
    const body = await req.json();
    const {
      type,
      title,
      message,
      recipientUserId,
      recipientRole,
      entityType,
      entityId,
      link,
    } = body;

    if (!type || !title || !message) {
      return NextResponse.json(
        { success: false, error: 'type, title, and message are required fields' },
        { status: 400 }
      );
    }

    const created = db.createNotification({
      type: type as NotificationType,
      title,
      message,
      recipientUserId,
      recipientRole: recipientRole || 'all',
      entityType,
      entityId,
      link,
      isRead: false,
    });

    recordAuditLog({
      actorUserId: guard.session.userId,
      actorEmail: guard.session.email,
      actorUserType: guard.session.userType,
      action: 'DISPATCH_NOTIFICATION',
      module: 'notifications',
      entityTable: 'notifications',
      entityId: created.id,
      recordIdentifier: `Notif [${type}] ${title}`,
      previousValue: 'State: Unsent',
      newValue: `State: Dispatched to ${recipientRole || 'all'}`,
      details: `Dispatched system notification: ${title} — ${message}`,
      status: 'SUCCESS',
    });

    return NextResponse.json({
      success: true,
      data: created,
      message: 'Notification triggered successfully',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to create notification' },
      { status: 500 }
    );
  }
}
