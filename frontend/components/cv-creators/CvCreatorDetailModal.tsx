'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { X, Users, Clock, Loader, CheckCheck, Ban } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface CvCreator {
  id: number;
  nombre: string;
  email: string;
  ingles: boolean;
  aleman: boolean;
  frances: boolean;
  italiano: boolean;
  activo: boolean;
  notas: string | null;
}

interface ClientInfo {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  estado: string;
  cvStatus: string;
  createdAt: string;
}

interface CreatorStats {
  total: number;
  pendiente: number;
  en_proceso: number;
  finalizado: number;
  cancelado: number;
}

interface CreatorStatsResponse {
  creator: CvCreator;
  stats: CreatorStats;
  clients: ClientInfo[];
}

type CvStatusFilter = 'todos' | 'pendiente' | 'en_proceso' | 'finalizado' | 'cancelado';

const CV_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  pendiente: { label: 'Pendiente', bg: 'bg-amber-100', text: 'text-amber-800' },
  en_proceso: { label: 'En Proceso', bg: 'bg-sky-100', text: 'text-sky-800' },
  finalizado: { label: 'Finalizado', bg: 'bg-emerald-100', text: 'text-emerald-800' },
  cancelado: { label: 'Cancelado', bg: 'bg-red-100', text: 'text-red-800' },
};

interface KPICardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  active?: boolean;
  onClick?: () => void;
}

function MiniKPICard({ title, value, icon, color, active, onClick }: KPICardProps) {
  return (
    <button
      onClick={onClick}
      className={`text-left w-full rounded-xl border p-4 transition-all duration-200 ${
        active
          ? 'ring-2 ring-blue-500 border-blue-300 shadow-md'
          : 'border-gray-100 hover:shadow-md hover:-translate-y-0.5'
      } bg-white`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-gray-50 ${color}`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500 font-medium">{title}</p>
        </div>
      </div>
    </button>
  );
}

interface CvCreatorDetailModalProps {
  creator: CvCreator;
  onClose: () => void;
}

export default function CvCreatorDetailModal({ creator, onClose }: CvCreatorDetailModalProps) {
  const [data, setData] = useState<CreatorStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<CvStatusFilter>('todos');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/cv-creators/${creator.id}/stats`);
        setData(response.data);
      } catch (error) {
        console.error('Error fetching creator stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [creator.id]);

  const getLanguages = () => {
    const langs = [];
    if (creator.ingles) langs.push('\u{1F1EC}\u{1F1E7} Ingles');
    if (creator.aleman) langs.push('\u{1F1E9}\u{1F1EA} Aleman');
    if (creator.frances) langs.push('\u{1F1EB}\u{1F1F7} Frances');
    if (creator.italiano) langs.push('\u{1F1EE}\u{1F1F9} Italiano');
    return langs;
  };

  const filteredClients = data?.clients.filter(c => {
    if (filter === 'todos') return true;
    return c.cvStatus === filter;
  }) || [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{creator.nombre}</h2>
            <p className="text-sm text-gray-500 mt-1">{creator.email}</p>
            <div className="flex gap-2 mt-2">
              {getLanguages().map((lang) => (
                <span key={lang} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                  {lang}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : data ? (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                <MiniKPICard
                  title="Total"
                  value={data.stats.total}
                  icon={<Users className="w-4 h-4" />}
                  color="text-blue-600"
                  active={filter === 'todos'}
                  onClick={() => setFilter('todos')}
                />
                <MiniKPICard
                  title="Pendientes"
                  value={data.stats.pendiente}
                  icon={<Clock className="w-4 h-4" />}
                  color="text-amber-600"
                  active={filter === 'pendiente'}
                  onClick={() => setFilter('pendiente')}
                />
                <MiniKPICard
                  title="En Proceso"
                  value={data.stats.en_proceso}
                  icon={<Loader className="w-4 h-4" />}
                  color="text-sky-600"
                  active={filter === 'en_proceso'}
                  onClick={() => setFilter('en_proceso')}
                />
                <MiniKPICard
                  title="Finalizados"
                  value={data.stats.finalizado}
                  icon={<CheckCheck className="w-4 h-4" />}
                  color="text-emerald-600"
                  active={filter === 'finalizado'}
                  onClick={() => setFilter('finalizado')}
                />
                <MiniKPICard
                  title="Cancelados"
                  value={data.stats.cancelado}
                  icon={<Ban className="w-4 h-4" />}
                  color="text-red-600"
                  active={filter === 'cancelado'}
                  onClick={() => setFilter('cancelado')}
                />
              </div>

              {/* Clients Table */}
              <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700">
                    Clientes asignados
                    {filter !== 'todos' && (
                      <span className="ml-2 text-xs font-normal text-gray-500">
                        Filtrando por: {CV_STATUS_CONFIG[filter]?.label}
                      </span>
                    )}
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">
                          Nombre
                        </th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">
                          Email
                        </th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">
                          Estado Cliente
                        </th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">
                          Estado CV
                        </th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">
                          Fecha
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {filteredClients.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                            {filter === 'todos'
                              ? 'No hay clientes asignados a este creador'
                              : `No hay clientes con estado "${CV_STATUS_CONFIG[filter]?.label}"`}
                          </td>
                        </tr>
                      ) : (
                        filteredClients.map((client) => {
                          const statusConfig = CV_STATUS_CONFIG[client.cvStatus] || CV_STATUS_CONFIG.pendiente;
                          return (
                            <tr key={client.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                {client.nombre} {client.apellido}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {client.email || '-'}
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                                  {client.estado || 'Sin estado'}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                                  {statusConfig.label}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                {client.createdAt
                                  ? new Date(client.createdAt).toLocaleDateString('es-ES')
                                  : '-'}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              Error al cargar las estadisticas
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
