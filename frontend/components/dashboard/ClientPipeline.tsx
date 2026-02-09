'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface PipelineStats {
    estado: string;
    count: number;
    percentage: number;
}

const ESTADO_CONFIG: Record<string, { color: string; label: string }> = {
    'Onboarding': { color: '#f59e0b', label: 'Onboarding' },
    'In Progress': { color: '#10b981', label: 'In Progress' },
    'Closed': { color: '#6b7280', label: 'Closed' },
    'Sin estado': { color: '#e5e7eb', label: 'Sin estado' },
};

const FALLBACK_COLORS = ['#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

export default function ClientPipeline() {
    const [pipeline, setPipeline] = useState<PipelineStats[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchPipeline() {
            try {
                const response = await fetch('/api/dashboard/pipeline');
                const data = await response.json();
                setPipeline(data.pipeline);
            } catch (error) {
                console.error('Error fetching pipeline:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchPipeline();
        const interval = setInterval(fetchPipeline, 60000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <Card className="h-full">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-semibold text-gray-900">Pipeline de Clientes</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-80 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 border-t-blue-600"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const total = pipeline.reduce((sum, s) => sum + s.count, 0);

    const chartData = pipeline.map((stat) => ({
        name: stat.estado,
        value: stat.count,
        percentage: stat.percentage,
    }));

    const getColor = (name: string, index: number) =>
        ESTADO_CONFIG[name]?.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length];

    return (
        <Card className="h-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold text-gray-900">Pipeline de Clientes</CardTitle>
                <p className="text-sm text-gray-500">Distribución por estado</p>
            </CardHeader>
            <CardContent>
                {/* Donut Chart with total in center */}
                <div className="relative w-full" style={{ height: '260px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={70}
                                outerRadius={110}
                                paddingAngle={3}
                                dataKey="value"
                                strokeWidth={0}
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={getColor(entry.name, index)} />
                                ))}
                            </Pie>
                            <Tooltip
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        return (
                                            <div className="bg-white shadow-lg rounded-lg px-4 py-3 border border-gray-100">
                                                <p className="text-sm font-semibold text-gray-900">{data.name}</p>
                                                <p className="text-sm text-gray-600">{data.value} clientes ({data.percentage.toFixed(1)}%)</p>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    {/* Center label */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-3xl font-bold text-gray-900">{total}</span>
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total</span>
                    </div>
                </div>

                {/* Legend / Stats */}
                <div className="mt-4 space-y-3">
                    {pipeline.map((stat, index) => {
                        const color = getColor(stat.estado, index);
                        return (
                            <div key={stat.estado} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-3 h-3 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: color }}
                                    />
                                    <span className="text-sm font-medium text-gray-700">
                                        {ESTADO_CONFIG[stat.estado]?.label || stat.estado}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{ width: `${stat.percentage}%`, backgroundColor: color }}
                                        />
                                    </div>
                                    <span className="text-sm font-bold text-gray-900 w-8 text-right">{stat.count}</span>
                                    <span className="text-xs text-gray-500 w-12 text-right">{stat.percentage.toFixed(1)}%</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
