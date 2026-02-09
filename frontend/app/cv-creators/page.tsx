'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Plus, Pencil, Trash2, CheckCircle, XCircle, Users, Clock, Loader, CheckCheck, Ban, UserX } from 'lucide-react';
import toast from 'react-hot-toast';
import CvCreatorModal from '@/components/cv-creators/CvCreatorModal';
import CvCreatorDetailModal from '@/components/cv-creators/CvCreatorDetailModal';
import { Card, CardContent } from '@/components/ui/card';

export interface CvCreator {
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

interface StatsSummary {
  totalAsignados: number;
  pendiente: number;
  enProceso: number;
  finalizado: number;
  cancelado: number;
  sinAsignar: number;
}

interface KPICardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: 'blue' | 'amber' | 'sky' | 'green' | 'red' | 'gray';
}

function KPICard({ title, value, icon, color = 'blue' }: KPICardProps) {
  const iconColors: Record<string, string> = {
    blue: 'text-blue-600',
    amber: 'text-amber-600',
    sky: 'text-sky-600',
    green: 'text-emerald-600',
    red: 'text-red-600',
    gray: 'text-gray-600',
  };

  return (
    <Card className="relative overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-gray-100 bg-white group">
      <CardContent className="p-5">
        <div className="flex flex-col gap-3">
          <div className={`p-2 rounded-xl bg-gray-50 w-fit ring-1 ring-gray-100 ${iconColors[color]}`}>
            {icon}
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900 tracking-tight leading-none">
              {value}
            </h3>
            <p className="text-xs font-medium text-gray-500 mt-1.5 tracking-wide">
              {title}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CvCreatorsPage() {
  const [creators, setCreators] = useState<CvCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCreator, setEditingCreator] = useState<CvCreator | null>(null);
  const [detailCreator, setDetailCreator] = useState<CvCreator | null>(null);
  const [stats, setStats] = useState<StatsSummary | null>(null);

  const fetchCreators = async () => {
    try {
      setLoading(true);
      const response = await api.get('/cv-creators');
      setCreators(response.data);
    } catch (error: any) {
      console.error('Error fetching CV creators:', error);
      toast.error('Error al cargar los creadores de CV');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/cv-creators/stats/summary');
      setStats(response.data);
    } catch (error: any) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchCreators();
    fetchStats();
  }, []);

  const handleAdd = () => {
    setEditingCreator(null);
    setIsModalOpen(true);
  };

  const handleEdit = (e: React.MouseEvent, creator: CvCreator) => {
    e.stopPropagation();
    setEditingCreator(creator);
    setIsModalOpen(true);
  };

  const handleDelete = async (e: React.MouseEvent, id: number, nombre: string) => {
    e.stopPropagation();
    if (!confirm(`¿Estas seguro de que deseas eliminar a ${nombre}?`)) {
      return;
    }

    try {
      await api.delete(`/cv-creators/${id}`);
      toast.success('Creador de CV eliminado correctamente');
      fetchCreators();
      fetchStats();
    } catch (error: any) {
      console.error('Error deleting creator:', error);
      toast.error('Error al eliminar el creador de CV');
    }
  };

  const handleRowClick = (creator: CvCreator) => {
    setDetailCreator(creator);
  };

  const handleModalClose = (refresh: boolean) => {
    setIsModalOpen(false);
    setEditingCreator(null);
    if (refresh) {
      fetchCreators();
      fetchStats();
    }
  };

  const handleDetailClose = () => {
    setDetailCreator(null);
  };

  const getLanguageIcons = (creator: CvCreator) => {
    const languages = [];
    if (creator.ingles) languages.push('\u{1F1EC}\u{1F1E7} Ingles');
    if (creator.aleman) languages.push('\u{1F1E9}\u{1F1EA} Aleman');
    if (creator.frances) languages.push('\u{1F1EB}\u{1F1F7} Frances');
    if (creator.italiano) languages.push('\u{1F1EE}\u{1F1F9} Italiano');
    return languages.join(', ');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Creadores de CV</h1>
          <p className="text-gray-600 mt-1">
            Gestiona los creadores de CV y sus idiomas asignados
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Agregar Creador
        </button>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <KPICard
            title="Total Asignados"
            value={stats.totalAsignados}
            icon={<Users className="w-5 h-5" />}
            color="blue"
          />
          <KPICard
            title="Pendientes"
            value={stats.pendiente}
            icon={<Clock className="w-5 h-5" />}
            color="amber"
          />
          <KPICard
            title="En Proceso"
            value={stats.enProceso}
            icon={<Loader className="w-5 h-5" />}
            color="sky"
          />
          <KPICard
            title="Finalizados"
            value={stats.finalizado}
            icon={<CheckCheck className="w-5 h-5" />}
            color="green"
          />
          <KPICard
            title="Cancelados"
            value={stats.cancelado}
            icon={<Ban className="w-5 h-5" />}
            color="red"
          />
          <KPICard
            title="Sin Asignar"
            value={stats.sinAsignar}
            icon={<UserX className="w-5 h-5" />}
            color="gray"
          />
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nombre
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Idiomas
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Notas
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {creators.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No hay creadores de CV registrados. Haz clic en &quot;Agregar Creador&quot; para comenzar.
                </td>
              </tr>
            ) : (
              creators.map((creator) => (
                <tr
                  key={creator.id}
                  className="hover:bg-blue-50 cursor-pointer transition-colors"
                  onClick={() => handleRowClick(creator)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {creator.nombre}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">{creator.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {getLanguageIcons(creator)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        creator.activo
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {creator.activo ? (
                        <>
                          <CheckCircle className="w-3 h-3" />
                          Activo
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3" />
                          Inactivo
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600 max-w-xs truncate">
                      {creator.notas || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={(e) => handleEdit(e, creator)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, creator.id, creator.nombre)}
                        className="text-red-600 hover:text-red-900"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <CvCreatorModal
          creator={editingCreator}
          onClose={handleModalClose}
        />
      )}

      {detailCreator && (
        <CvCreatorDetailModal
          creator={detailCreator}
          onClose={handleDetailClose}
        />
      )}
    </div>
  );
}
