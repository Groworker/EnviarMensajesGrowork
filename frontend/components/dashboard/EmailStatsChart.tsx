'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
        // Refresh every 2 minutes
        const interval = setInterval(fetchStats, 120000);
        return () => clearInterval(interval);
    }, [days]);

    if (loading || !stats) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Estadísticas de Emails</CardTitle>
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
                    <div>
                        <CardTitle>Estadísticas de Emails</CardTitle>
                        <p className="text-sm text-gray-600 mt-1">
                            Total: {stats.totalSent} | Exitosos: {stats.successCount} | Fallidos: {stats.failureCount}
                        </p>
                    </div>
                    <Select value={days.toString()} onValueChange={(value) => setDays(parseInt(value))}>
                        <SelectTrigger className="w-40">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7">Últimos 7 días</SelectItem>
                            <SelectItem value="14">Últimos 14 días</SelectItem>
                            <SelectItem value="30">Últimos 30 días</SelectItem>
                            <SelectItem value="60">Últimos 60 días</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-600 font-medium">Total Enviados</p>
                        <p className="text-2xl font-bold mt-1">{stats.totalSent}</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                        <p className="text-sm text-green-600 font-medium">Exitosos</p>
                        <p className="text-2xl font-bold mt-1">{stats.successCount}</p>
                    </div>
                    <div className="p-4 bg-red-50 rounded-lg">
                        <p className="text-sm text-red-600 font-medium">Fallidos</p>
                        <p className="text-2xl font-bold mt-1">{stats.failureCount}</p>
                    </div>
                </div>

                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.byDay}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="date"
                                tickFormatter={(value) => new Date(value).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                            />
                            <YAxis />
                            <Tooltip
                                labelFormatter={(value) => new Date(value).toLocaleDateString('es-ES')}
                                formatter={(value: number | undefined, name: string) => {
                                    if (value === undefined) return [0, name];
                                    const labels: Record<string, string> = {
                                        success: 'Exitosos',
                                        failed: 'Fallidos',
                                        sent: 'Enviados'
                                    };
                                    return [value, labels[name] || name];
                                }}
                            />
                            <Legend
                                formatter={(value) => {
                                    const labels: Record<string, string> = {
                                        success: 'Exitosos',
                                        failed: 'Fallidos',
                                        sent: 'Total'
                                    };
                                    return labels[value] || value;
                                }}
                            />
                            <Bar dataKey="success" fill="#10b981" name="success" />
                            <Bar dataKey="failed" fill="#ef4444" name="failed" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="mt-6 pt-6 border-t">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Tasa de Éxito</span>
                        <div className="flex items-center gap-2">
                            <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-green-500 transition-all duration-500"
                                    style={{ width: `${stats.successRate}%` }}
                                ></div>
                            </div>
                            <span className="text-lg font-bold">{stats.successRate.toFixed(1)}%</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
