'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Clock, TrendingUp, UserCheck } from 'lucide-react';

interface KPIData {
    totalClients: number;
    onboarding: number;
    inProgress: number;
    closed: number;
}

interface KPICardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color?: 'blue' | 'amber' | 'green' | 'gray';
}
function KPICard({ title, value, icon, color }: KPICardProps) {
    const icons: Record<string, string> = {
        blue: 'text-blue-600',
        amber: 'text-amber-600',
        green: 'text-emerald-600',
        gray: 'text-gray-600',
    };

    const iconColor = icons[color || 'blue'];

    return (
        <Card className="relative overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-gray-100 bg-white group">
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-${color || 'blue'}-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />

            <CardContent className="p-6">
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <div className={`p-2.5 rounded-xl bg-gray-50 group-hover:bg-white group-hover:shadow-sm ring-1 ring-gray-100 transition-all duration-300 ${iconColor}`}>
                            {icon}
                        </div>
                    </div>

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
                    totalClients: 0,
                    onboarding: 0,
                    inProgress: 0,
                    closed: 0
                });
            } catch (error) {
                console.error('Error fetching KPIs:', error);
                setKpis({
                    totalClients: 0,
                    onboarding: 0,
                    inProgress: 0,
                    closed: 0
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <KPICard
                title="Clientes Totales"
                value={kpis.totalClients}
                icon={<Users className="w-6 h-6" />}
                color="blue"
            />
            <KPICard
                title="Onboarding"
                value={kpis.onboarding}
                icon={<Clock className="w-6 h-6" />}
                color="amber"
            />
            <KPICard
                title="In Progress"
                value={kpis.inProgress}
                icon={<TrendingUp className="w-6 h-6" />}
                color="green"
            />
            <KPICard
                title="Closed"
                value={kpis.closed}
                icon={<UserCheck className="w-6 h-6" />}
                color="gray"
            />
        </div>
    );
}
