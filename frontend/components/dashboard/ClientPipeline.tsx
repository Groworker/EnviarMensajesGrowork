'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface PipelineStats {
    estado: string;
    count: number;
    percentage: number;
}

const ESTADO_COLORS: Record<string, string> = {
    'Activo': '#10b981',
    'Pausado': '#f59e0b',
    'Cerrado': '#ef4444',
    'Prospecto': '#3b82f6',
    'En Proceso': '#8b5cf6',
    'Sin estado': '#6b7280'
};

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
        // Refresh every 60 seconds
        const interval = setInterval(fetchPipeline, 60000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Pipeline de Clientes</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-80 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const chartData = pipeline.map((stat) => ({
        name: stat.estado,
        value: stat.count,
        percentage: stat.percentage
    }));

    return (
        <Card>
            <CardHeader>
                <CardTitle>Pipeline de Clientes</CardTitle>
                <p className="text-sm text-gray-600">Distribución por estado</p>
            </CardHeader>
            <CardContent>
                <div className="w-full h-80" style={{ minHeight: '320px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={(entry: any) => `${entry.name}: ${entry.percentage.toFixed(1)}%`}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={ESTADO_COLORS[entry.name] || '#6b7280'} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value: number | undefined) => value ? [`${value} clientes`, 'Cantidad'] : ['0 clientes', 'Cantidad']} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4">
                    {pipeline.map((stat) => (
                        <div key={stat.estado} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: ESTADO_COLORS[stat.estado] || '#6b7280' }}
                                ></div>
                                <span className="text-sm font-medium">{stat.estado}</span>
                            </div>
                            <div className="text-right">
                                <p className="text-lg font-bold">{stat.count}</p>
                                <p className="text-xs text-gray-600">{stat.percentage.toFixed(1)}%</p>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
