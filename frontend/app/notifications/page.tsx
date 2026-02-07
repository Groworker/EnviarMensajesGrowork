'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { RefreshCw } from 'lucide-react';
import WorkflowColumn from '@/components/notifications/WorkflowColumn';
import toast from 'react-hot-toast';

export interface PipelineColumn {
  workflowType: string;
  title: string;
  description: string;
  clients: ClientWorkflowCard[];
  requiresManualAction: boolean;
}

export interface ClientWorkflowCard {
  clientId: number;
  clientName: string;
  estado: string;
  status: 'PENDING' | 'OK' | 'ERROR';
  executionUrl: string | null;
  executedAt: string | null;
  errorMessage: string | null;
  metadata: Record<string, any> | null;
  driveFolder: string | null;
  nextWorkflow: string | null;
}

export default function NotificationsPage() {
  const [pipeline, setPipeline] = useState<PipelineColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPipeline = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      const response = await api.get('/workflow-states/pipeline');
      setPipeline(response.data);
    } catch (error: any) {
      console.error('Error fetching pipeline:', error);
      if (!silent) {
        toast.error('Error al cargar el pipeline de workflows');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPipeline();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchPipeline(true);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    fetchPipeline(true);
    toast.success('Pipeline actualizado');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-2">
          <RefreshCw className="animate-spin" size={24} />
          <span className="text-gray-600">Cargando workflows...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Notificaciones - Pipeline de Workflows
            </h1>
            <p className="mt-2 text-gray-600">
              Vista estilo Pipedrive de los workflows de cada cliente
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw
              size={18}
              className={refreshing ? 'animate-spin' : ''}
            />
            <span>Actualizar</span>
          </button>
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span className="text-gray-700">PENDIENTE</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-gray-700">OK</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-gray-700">ERROR</span>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-6">
        {pipeline.map((column) => (
          <WorkflowColumn
            key={column.workflowType}
            column={column}
            onRefresh={() => fetchPipeline(true)}
          />
        ))}
      </div>

      {pipeline.length === 0 && (
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">No hay workflows para mostrar</p>
        </div>
      )}
    </div>
  );
}
