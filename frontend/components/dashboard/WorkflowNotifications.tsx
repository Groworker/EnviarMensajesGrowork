'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Bell,
    CheckCircle2,
    XCircle,
    Info,
    AlertTriangle,
    ExternalLink,
    Folder,
    Mail,
    Unlock,
    Database,
    FileText,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
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
        zohoId?: string;
    };
    relatedWorkflow?: string;
    metadata?: Record<string, any>;
    isRead: boolean;
    createdAt: string;
}

const WORKFLOW_NAMES: Record<string, string> = {
    'BuL088npiVZ6gak7': 'WKF-1: Estructura y Carpetas',
    'Ze3INzogY594XOCg': 'WKF-1.1: Asignar Creador',
    'Ajfl4VnlJbPlA03E': 'WKF-1.2: Nuevo Archivo NEW',
    'EoSIHDe8HPHQrUWT': 'WKF-1.3: Mover CV a DEF',
    '49XoEhgqjyRt3LSg': 'WKF-4: Email Corporativo'
};

export default function WorkflowNotifications() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

    const toggleExpand = (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    async function fetchNotifications() {
        try {
            const [notifResponse, countResponse] = await Promise.all([
                fetch('/api/notifications?limit=20'),
                fetch('/api/notifications/unread/count')
            ]);
            const notifData = await notifResponse.json();
            const countData = await countResponse.json();
            setNotifications(notifData.notifications || []);
            setUnreadCount(countData.count || 0);
        } catch (error) {
            console.error('Error fetching notifications:', error);

            // Try to get response details if available
            if (error instanceof Error && error.message.includes('Backend')) {
                // This was thrown by our proxy
                console.error('Backend Details:', error.message);
            }

            setNotifications([]);
            setUnreadCount(0);
        } finally { }
    }

    async function markAsRead(id: number) {
        try {
            await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, isRead: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    }

    const getSeverityStyles = (severity: string) => {
        switch (severity) {
            case 'success': return 'bg-green-50 border-green-200 text-green-900';
            case 'error': return 'bg-red-50 border-red-200 text-red-900';
            case 'warning': return 'bg-orange-50 border-orange-200 text-orange-900';
            default: return 'bg-blue-50 border-blue-200 text-blue-900';
        }
    };

    const getIcon = (severity: string) => {
        switch (severity) {
            case 'success': return <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />;
            case 'error': return <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />;
            case 'warning': return <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0" />;
            default: return <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />;
        }
    };

    const renderMetadata = (notification: Notification) => {
        const meta = notification.metadata || {};
        const client = notification.relatedClient;
        const expanded = expandedIds.has(notification.id);

        return (
            <div className="mt-3 text-sm space-y-2 border-t border-gray-200/50 pt-2">
                {/* Client Info */}
                {client && (
                    <div className="flex items-center gap-2 text-gray-700">
                        <div className="bg-gray-200 p-1 rounded">
                            <Database className="w-3 h-3" />
                        </div>
                        <span className="font-semibold">Cliente:</span>
                        <span>{client.nombre} {client.apellido}</span>
                    </div>
                )}

                {/* Zoho Link */}
                {(meta.zohoId || client?.zohoId) && (
                    <div className="flex items-center gap-2">
                        <ExternalLink className="w-3 h-3 text-blue-500" />
                        <a
                            href={`https://crm.zoho.eu/crm/org20066589334/tab/Contacts/${meta.zohoId || client?.zohoId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-xs font-medium"
                            onClick={(e) => e.stopPropagation()}
                        >
                            Ver en Zoho CRM
                        </a>
                    </div>
                )}

                {/* Expandable Details */}
                {expanded && (
                    <div className="space-y-2 mt-2 animate-in fade-in slide-in-from-top-1">
                        {/* Email Details */}
                        {(meta.email_operativo || meta.email_destino) && (
                            <div className="bg-white/50 p-2 rounded border border-gray-100 space-y-1">
                                {meta.email_destino && (
                                    <div className="flex items-center gap-2">
                                        <Mail className="w-3 h-3 text-gray-500" />
                                        <span className="text-gray-600 text-xs">Destino:</span>
                                        <span className="font-mono text-xs">{meta.email_destino}</span>
                                    </div>
                                )}
                                {meta.email_operativo && (
                                    <div className="flex items-center gap-2">
                                        <Mail className="w-3 h-3 text-blue-500" />
                                        <span className="text-gray-600 text-xs">Corporativo:</span>
                                        <span className="font-mono text-xs text-blue-700">{meta.email_operativo}</span>
                                    </div>
                                )}
                                {meta.password && (
                                    <div className="flex items-center gap-2">
                                        <Unlock className="w-3 h-3 text-orange-500" />
                                        <span className="text-gray-600 text-xs">Contraseña:</span>
                                        <span className="font-mono text-xs bg-gray-100 px-1 rounded blur-sm hover:blur-none transition-all cursor-help" title="Click to reveal">
                                            {meta.password}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Folder Links */}
                        {(meta.folder_url || meta.carpeta_url) && (
                            <div className="flex items-center gap-2">
                                <Folder className="w-3 h-3 text-yellow-600" />
                                <a
                                    href={meta.folder_url || meta.carpeta_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline text-xs"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    Abrir Carpeta Drive
                                </a>
                            </div>
                        )}

                        {/* Technical Details */}
                        <div className="pt-2">
                            <div className="text-xs text-gray-400 font-mono">
                                ID: {notification.relatedWorkflow || 'System'} • Event: {meta.event || 'N/A'}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    if (loading) {
        return (
            <Card className="h-full border-none shadow-none bg-transparent">
                <CardHeader className="px-0 pt-0">
                    <CardTitle className="text-lg flex items-center gap-2 text-gray-700">
                        <Bell className="w-5 h-5" /> Notificaciones
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-0">
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="h-full border-none shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0 pb-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2 text-gray-800">
                        <Bell className="w-5 h-5" /> Notificaciones
                    </CardTitle>
                    {unreadCount > 0 && (
                        <Badge variant="destructive" className="rounded-full px-3">
                            {unreadCount} nuevas
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="px-0">
                <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200">
                    {notifications.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
                            <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-gray-500 text-sm">No tienes notificaciones recientes</p>
                        </div>
                    ) : (
                        notifications.map((notification) => (
                            <div
                                key={notification.id}
                                onClick={() => !notification.isRead && markAsRead(notification.id)}
                                className={`
                                    relative p-4 rounded-xl border-l-4 transition-all duration-200 hover:shadow-md
                                    ${getSeverityStyles(notification.severity)}
                                    ${!notification.isRead ? 'shadow-sm translate-x-1' : 'opacity-80 hover:opacity-100'}
                                    group
                                `}
                            >
                                <div className="flex items-start gap-3">
                                    {getIcon(notification.severity)}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <h4 className="font-bold text-sm leading-tight text-gray-900">
                                                {notification.title}
                                            </h4>
                                            <span className="text-[10px] text-gray-500 whitespace-nowrap ml-2">
                                                {formatDistanceToNow(new Date(notification.createdAt), { locale: es, addSuffix: true })}
                                            </span>
                                        </div>

                                        <p className="text-sm text-gray-700 leading-relaxed">
                                            {notification.message}
                                        </p>

                                        {renderMetadata(notification)}
                                    </div>

                                    <button
                                        onClick={(e) => toggleExpand(notification.id, e)}
                                        className="text-gray-400 hover:text-gray-600 p-1 hover:bg-black/5 rounded transition-colors"
                                    >
                                        {expandedIds.has(notification.id) ? (
                                            <ChevronUp className="w-4 h-4" />
                                        ) : (
                                            <ChevronDown className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>

                                {!notification.isRead && (
                                    <div className="absolute top-4 right-4 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                                )}
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
