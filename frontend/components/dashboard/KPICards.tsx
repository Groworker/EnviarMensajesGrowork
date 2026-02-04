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
}

function KPICard({ title, value, icon, trend, trendDirection = 'neutral' }: KPICardProps) {
    const trendColors = {
        up: 'text-green-600',
        down: 'text-red-600',
        neutral: 'text-gray-600'
    };

    return (
        <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-600">{title}</p>
                        <h3 className="text-3xl font-bold mt-2">{value}</h3>
                        {trend && (
                            <p className={`text-sm mt-1 ${trendColors[trendDirection]}`}>
                                {trend}
                            </p>
                        )}
                    </div>
                    <div className="p-3 bg-blue-50 rounded-full">{icon}</div>
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
                // Set default values on error to prevent crash
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
        // Refresh every 30 seconds
        const interval = setInterval(fetchKPIs, 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading || !kpis) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {[...Array(5)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                        <CardContent className="p-6">
                            <div className="h-20 bg-gray-200 rounded"></div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <KPICard
                title="Clientes Activos"
                value={kpis.activeClients}
                icon={<Users className="w-6 h-6 text-blue-600" />}
            />
            <KPICard
                title="Emails Enviados (30d)"
                value={kpis.totalEmailsSent}
                icon={<Mail className="w-6 h-6 text-blue-600" />}
            />
            <KPICard
                title="Tasa de Éxito"
                value={`${kpis.emailSuccessRate.toFixed(1)}%`}
                icon={<CheckCircle2 className="w-6 h-6 text-green-600" />}
                trend={kpis.emailSuccessRate >= 90 ? 'Excelente' : kpis.emailSuccessRate >= 70 ? 'Bueno' : 'Necesita atención'}
                trendDirection={kpis.emailSuccessRate >= 90 ? 'up' : kpis.emailSuccessRate >= 70 ? 'neutral' : 'down'}
            />
            <KPICard
                title="Notificaciones"
                value={kpis.unreadNotifications}
                icon={<Bell className="w-6 h-6 text-blue-600" />}
            />
            <KPICard
                title="Eliminaciones (7d)"
                value={kpis.recentDeletions}
                icon={<AlertTriangle className="w-6 h-6 text-orange-600" />}
            />
        </div>
    );
}
