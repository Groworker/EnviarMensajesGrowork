'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, CheckCircle, XCircle } from 'lucide-react';

interface EmailStats {
    totalSent: number;
    successCount: number;
    failureCount: number;
    successRate: number;
    byDay: Array<{ date: string; sent: number; success: number; failed: number }>;
}

export default function EmailStatsChart() {
    const [stats, setStats] = useState<EmailStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState(30);

    useEffect(() => {
        async function fetchStats() {
            try {
                const response = await fetch(`/api/dashboard/email-stats?days=${days}`);
                const data = await response.json();
                setStats(data.stats);
            } catch (error) {
                console.error('Error fetching email stats:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchStats();
        const interval = setInterval(fetchStats, 120000);
        return () => clearInterval(interval);
    }, [days]);

    if (loading || !stats) {
        return (
            <Card className="h-full">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-semibold text-gray-900">Estadísticas de Emails</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-80 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 border-t-blue-600"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="h-full">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg font-semibold text-gray-900">Estadísticas de Emails</CardTitle>
                        <p className="text-sm text-gray-500 mt-0.5">Rendimiento de envíos</p>
                    </div>
                    <Select value={days.toString()} onValueChange={(value) => setDays(parseInt(value))}>
                        <SelectTrigger className="w-36 h-9 text-sm">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7">7 días</SelectItem>
                            <SelectItem value="14">14 días</SelectItem>
                            <SelectItem value="30">30 días</SelectItem>
                            <SelectItem value="60">60 días</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent>
                {/* Metric Cards */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <div className="p-2 rounded-lg bg-blue-50">
                            <Mail className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 leading-none">{stats.totalSent}</p>
                            <p className="text-xs font-medium text-gray-500 mt-1">Enviados</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <div className="p-2 rounded-lg bg-emerald-50">
                            <CheckCircle className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 leading-none">{stats.successCount}</p>
                            <p className="text-xs font-medium text-gray-500 mt-1">Exitosos</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <div className="p-2 rounded-lg bg-red-50">
                            <XCircle className="w-4 h-4 text-red-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 leading-none">{stats.failureCount}</p>
                            <p className="text-xs font-medium text-gray-500 mt-1">Fallidos</p>
                        </div>
                    </div>
                </div>

                {/* Chart */}
                <div style={{ height: '240px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.byDay} barCategoryGap="20%">
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                            <XAxis
                                dataKey="date"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 12, fill: '#9ca3af' }}
                                tickFormatter={(value) => {
                                    const d = new Date(value);
                                    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
                                }}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 12, fill: '#9ca3af' }}
                                allowDecimals={false}
                            />
                            <Tooltip
                                cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                                content={({ active, payload, label }) => {
                                    if (active && payload && payload.length && label) {
                                        const d = new Date(String(label));
                                        return (
                                            <div className="bg-white shadow-lg rounded-lg px-4 py-3 border border-gray-100">
                                                <p className="text-sm font-semibold text-gray-900 mb-1">
                                                    {d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'long' })}
                                                </p>
                                                {payload.map((entry: any) => (
                                                    <div key={entry.dataKey} className="flex items-center gap-2 text-sm">
                                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.fill }} />
                                                        <span className="text-gray-600">{entry.dataKey === 'success' ? 'Exitosos' : 'Fallidos'}:</span>
                                                        <span className="font-semibold text-gray-900">{entry.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Bar dataKey="success" fill="#10b981" radius={[4, 4, 0, 0]} name="success" />
                            <Bar dataKey="failed" fill="#ef4444" radius={[4, 4, 0, 0]} name="failed" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Success Rate Footer */}
                <div className="mt-5 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                <span className="text-xs font-medium text-gray-500">Exitosos</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                                <span className="text-xs font-medium text-gray-500">Fallidos</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-medium text-gray-500">Tasa de éxito</span>
                            <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                                    style={{ width: `${stats.successRate}%` }}
                                />
                            </div>
                            <span className="text-sm font-bold text-gray-900">{stats.successRate.toFixed(1)}%</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
