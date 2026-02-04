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
function KPICard({ title, value, icon, trend, trendDirection = 'neutral', color }: KPICardProps) {
    const trendColors = {
        up: 'text-emerald-600 bg-emerald-50/50 border-emerald-100',
        down: 'text-rose-600 bg-rose-50/50 border-rose-100',
        neutral: 'text-slate-600 bg-slate-50/50 border-slate-100'
    };

    const icons = {
        blue: 'text-blue-600',
        indigo: 'text-indigo-600',
        green: 'text-emerald-600',
        purple: 'text-violet-600',
        red: 'text-rose-600',
    };

    const iconColor = icons[color || 'blue'];

    return (
        <Card className="relative overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-gray-100 bg-white group">
            {/* Minimalist Top accent */}
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-${color || 'blue'}-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />

            <CardContent className="p-6">
                <div className="flex flex-col gap-4">
                    {/* Header: Icon & Title */}
                    <div className="flex items-center justify-between">
                        <div className={`p-2.5 rounded-xl bg-gray-50 group-hover:bg-white group-hover:shadow-sm ring-1 ring-gray-100 transition-all duration-300 ${iconColor}`}>
                            {icon}
                        </div>
                        {trend && (
                            <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${trendColors[trendDirection]}`}>
                                {trendDirection === 'up' && '↑'}
                                {trendDirection === 'down' && '↓'}
                                <span className={trendDirection !== 'neutral' ? 'ml-1' : ''}>{trend}</span>
                            </div>
                        )}
                    </div>

                    {/* Value Area */}
                    <div>
                        <h3 className="text-3xl font-bold text-gray-900 tracking-tight leading-none group-hover:scale-105 transition-transform duration-300 origin-left">
                            {value}
                        </h3>
                        <p className="text-sm font-medium text-gray-500 mt-2 tracking-wide">
                            {title}
                        </p>
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
