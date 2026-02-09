'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { RefreshCw, Filter, Search, X } from 'lucide-react';
import WorkflowColumn from '@/components/notifications/WorkflowColumn';
import toast from 'react-hot-toast';

export interface PipelineColumn {
  workflowType: string;
  title: string;
  description: string;
  clients: ClientWorkflowCard[];
  requiresManualAction: boolean;
}

export interface WorkflowState {
  workflowType: string;
  status: 'PENDING' | 'OK' | 'ERROR';
  executionUrl: string | null;
  executedAt: string | null;
  errorMessage: string | null;
  metadata: Record<string, any> | null;
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
  oldFolderId: string | null;
  hasFilesInOldFolder: boolean;
  cvCreatorName: string | null;
  currentWorkflow: string;
  allWorkflows: WorkflowState[];
}

export default function NotificationsPage() {
  const [pipeline, setPipeline] = useState<PipelineColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clientFilter, setClientFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | 'OK' | 'PENDING' | 'ERROR'>('');

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

  // Filter pipeline based on client and status filters
  const filteredPipeline = pipeline.map(column => ({
    ...column,
    clients: column.clients.filter(client => {
      const matchesClient = clientFilter === '' ||
        client.clientName.toLowerCase().includes(clientFilter.toLowerCase());
      const matchesStatus = statusFilter === '' || client.status === statusFilter;
      return matchesClient && matchesStatus;
    })
  })).filter(column => column.clients.length > 0); // Only show columns with clients

  const totalClientsCount = pipeline.reduce((sum, col) => sum + col.clients.length, 0);
  const filteredClientsCount = filteredPipeline.reduce((sum, col) => sum + col.clients.length, 0);

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

      {/* Filters Bar */}
      <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm font-medium text-gray-600 flex items-center gap-1">
            <Filter size={14} />
            Filtros:
          </span>

          {/* Client Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar cliente..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm w-64"
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Estado:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as '' | 'OK' | 'PENDING' | 'ERROR')}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
            >
              <option value="">Todos</option>
              <option value="OK">OK</option>
              <option value="PENDING">Pendiente</option>
              <option value="ERROR">Error</option>
            </select>
          </div>

          {/* Clear Filters */}
          {(clientFilter || statusFilter) && (
            <button
              onClick={() => {
                setClientFilter('');
                setStatusFilter('');
              }}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition flex items-center gap-1"
            >
              <X size={14} />
              Limpiar filtros
            </button>
          )}

          {/* Results count */}
          <span className="ml-auto text-sm text-gray-500">
            {filteredClientsCount} de {totalClientsCount} clientes
          </span>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-6">
        {filteredPipeline.map((column) => (
          <WorkflowColumn
            key={column.workflowType}
            column={column}
            onRefresh={() => fetchPipeline(true)}
          />
        ))}
      </div>

      {filteredPipeline.length === 0 && (
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">
            {clientFilter || statusFilter
              ? 'No hay clientes que coincidan con los filtros'
              : 'No hay workflows para mostrar'}
          </p>
        </div>
      )}
    </div>
  );
}
