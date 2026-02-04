'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Mail, CheckCircle2, Bell, AlertTriangle } from 'lucide-react';

interface KPIData {
    activeClients: number;
    totalEmailsSent: number;
    emailSuccessRate: number;
    unreadNotifications: number;
    recentDeletions: number;
}

interface KPICardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    trend?: string;
    trendDirection?: 'up' | 'down' | 'neutral';
    color?: 'blue' | 'indigo' | 'green' | 'purple' | 'red';
}

function KPICard({ title, value, icon, trend, trendDirection = 'neutral', color }: KPICardProps) {
    const trendColors = {
        up: 'text-emerald-600 bg-emerald-50',
        down: 'text-red-600 bg-red-50',
        neutral: 'text-gray-600 bg-gray-50'
    };

    const colorStyles = {
        blue: { icon: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
        indigo: { icon: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
        green: { icon: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
        purple: { icon: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
        red: { icon: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
    };

    const style = colorStyles[color || 'blue'];

    return (
        <Card className={`hover:shadow-lg transition-all duration-300 border ${style.border} group`}>
            <CardContent className="p-5">
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">{title}</p>
                        <h3 className="text-3xl font-black text-gray-900 tracking-tight">{value}</h3>
                        {trend && (
                            <div className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-2 ${trendColors[trendDirection]}`}>
                                {trendDirection === 'up' && '↑'}
                                {trendDirection === 'down' && '↓'}
                                <span className="ml-1">{trend}</span>
                            </div>
                        )}
                    </div>
                    <div className={`p-3 rounded-xl ${style.bg} ${style.icon} group-hover:scale-110 transition-transform duration-300`}>
                        {icon}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export default function KPICards() {
    const [kpis, setKpis] = useState<KPIData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchKPIs() {
            try {
                const response = await fetch('/api/dashboard/kpis');
                const data = await response.json();
                setKpis(data.kpis || {
                    activeClients: 0,
                    totalEmailsSent: 0,
                    emailSuccessRate: 0,
                    unreadNotifications: 0,
                    recentDeletions: 0
                });
            } catch (error) {
                console.error('Error fetching KPIs:', error);
                setKpis({
                    activeClients: 0,
                    totalEmailsSent: 0,
                    emailSuccessRate: 0,
                    unreadNotifications: 0,
                    recentDeletions: 0
                });
            } finally {
                setLoading(false);
            }
        }

        fetchKPIs();
        const interval = setInterval(fetchKPIs, 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading || !kpis) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {[...Array(5)].map((_, i) => (
                    <Card key={i} className="animate-pulse border-none shadow-sm">
                        <CardContent className="p-6">
                            <div className="flex justify-between">
                                <div className="space-y-3">
                                    <div className="h-4 w-24 bg-gray-100 rounded"></div>
                                    <div className="h-8 w-16 bg-gray-200 rounded"></div>
                                </div>
                                <div className="h-12 w-12 bg-gray-100 rounded-xl"></div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
            <KPICard
                title="Clientes Activos"
                value={kpis.activeClients}
                icon={<Users className="w-6 h-6" />}
                color="blue"
            />
            <KPICard
                title="Emails Enviados"
                value={kpis.totalEmailsSent}
                icon={<Mail className="w-6 h-6" />}
                color="indigo"
            />
            <KPICard
                title="Tasa de Éxito"
                value={`${kpis.emailSuccessRate.toFixed(1)}%`}
                icon={<CheckCircle2 className="w-6 h-6" />}
                trend={kpis.emailSuccessRate >= 90 ? 'Excelente' : kpis.emailSuccessRate >= 70 ? 'Bueno' : 'Bajo'}
                trendDirection={kpis.emailSuccessRate >= 90 ? 'up' : kpis.emailSuccessRate >= 70 ? 'neutral' : 'down'}
                color="green"
            />
            <KPICard
                title="Notificaciones"
                value={kpis.unreadNotifications}
                icon={<Bell className="w-6 h-6" />}
                color="purple"
            />
            <KPICard
                title="Eliminaciones"
                value={kpis.recentDeletions}
                icon={<AlertTriangle className="w-6 h-6" />}
                color="red"
            />
        </div>
    );
}
