'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, CheckCircle2, XCircle, Info, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Notification {
    id: number;
    type: string;
    title: string;
    message: string;
    severity: 'info' | 'success' | 'warning' | 'error';
    relatedClient?: {
        id: number;
        nombre: string;
        apellido: string;
    };
    relatedWorkflow?: string;
    isRead: boolean;
    createdAt: string;
}

const SEVERITY_ICONS = {
    info: <Info className="w-5 h-5 text-blue-600" />,
    success: <CheckCircle2 className="w-5 h-5 text-green-600" />,
    warning: <AlertTriangle className="w-5 h-5 text-orange-600" />,
    error: <XCircle className="w-5 h-5 text-red-600" />
};

const SEVERITY_COLORS = {
    info: 'bg-blue-50 border-blue-200',
    success: 'bg-green-50 border-green-200',
    warning: 'bg-orange-50 border-orange-200',
    error: 'bg-red-50 border-red-200'
};

const WORKFLOW_NAMES: Record<string, string> = {
    'BuL088npiVZ6gak7': 'WKF-1: Creador Carpetas',
    'Ze3INzogY594XOCg': 'WKF-1.1: Avisar Creador',
    'Ajfl4VnlJbPlA03E': 'WKF-1.2: Nuevo Archivo',
    'EoSIHDe8HPHQrUWT': 'WKF-1.3: Mover CV',
    '49XoEhgqjyRt3LSg': 'WKF-4: Email Corporativo'
};

export default function WorkflowNotifications() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchNotifications() {
            try {
                const [notifResponse, countResponse] = await Promise.all([
                    fetch('/api/notifications?limit=10'),
                    fetch('/api/notifications/unread/count')
                ]);

                const notifData = await notifResponse.json();
                const countData = await countResponse.json();

                setNotifications(notifData.notifications);
                setUnreadCount(countData.count);
            } catch (error) {
                console.error('Error fetching notifications:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchNotifications();
        // Refresh every 30 seconds
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    async function markAsRead(id: number) {
        try {
            await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, isRead: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bell className="w-5 h-5" />
                        Notificaciones
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-96 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Bell className="w-5 h-5" />
                        Notificaciones
                    </CardTitle>
                    {unreadCount > 0 && (
                        <Badge variant="destructive">{unreadCount} nuevas</Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">No hay notificaciones</p>
                    ) : (
                        notifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={`p-4 rounded-lg border transition-all cursor-pointer ${SEVERITY_COLORS[notification.severity]
                                    } ${!notification.isRead ? 'shadow-md' : 'opacity-70'}`}
                                onClick={() => !notification.isRead && markAsRead(notification.id)}
                            >
                                <div className="flex items-start gap-3">
                                    {SEVERITY_ICONS[notification.severity]}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-semibold text-sm">{notification.title}</h4>
                                            {!notification.isRead && (
                                                <Badge variant="secondary" className="text-xs">Nueva</Badge>
                                            )}
                                        </div>
                                        {notification.message && (
                                            <p className="text-sm text-gray-700 mb-2">{notification.message}</p>
                                        )}
                                        <div className="flex items-center gap-3 text-xs text-gray-600">
                                            <span>{formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: es })}</span>
                                            {notification.relatedWorkflow && (
                                                <Badge variant="outline" className="text-xs">
                                                    {WORKFLOW_NAMES[notification.relatedWorkflow] || notification.relatedWorkflow}
                                                </Badge>
                                            )}
                                            {notification.relatedClient && (
                                                <span className="font-medium">
                                                    {notification.relatedClient.nombre} {notification.relatedClient.apellido}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
