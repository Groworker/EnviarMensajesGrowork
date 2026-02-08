'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Plus, Pencil, Trash2, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import DominioModal from '@/components/dominios/DominioModal';

export interface Dominio {
  id: number;
  dominio: string;
  activo: boolean;
  prioridad: number;
  usuariosActuales: number | null;
  maxUsuarios: number;
  createdAt: string;
  updatedAt: string;
}

export default function DominiosPage() {
  const [dominios, setDominios] = useState<Dominio[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDominio, setEditingDominio] = useState<Dominio | null>(null);

  const fetchDominios = async () => {
    try {
      setLoading(true);
      const response = await api.get('/dominios');
      setDominios(response.data);
    } catch (error: any) {
      console.error('Error fetching dominios:', error);
      toast.error('Error al cargar los dominios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDominios();
  }, []);

  const handleAdd = () => {
    setEditingDominio(null);
    setIsModalOpen(true);
  };

  const handleEdit = (dominio: Dominio) => {
    setEditingDominio(dominio);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number, nombre: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar el dominio ${nombre}?`)) {
      return;
    }

    try {
      await api.delete(`/dominios/${id}`);
      toast.success('Dominio eliminado correctamente');
      fetchDominios();
    } catch (error: any) {
      console.error('Error deleting dominio:', error);
      toast.error('Error al eliminar el dominio');
    }
  };

  const handleToggleActive = async (dominio: Dominio) => {
    try {
      await api.put(`/dominios/${dominio.id}`, { activo: !dominio.activo });
      toast.success(
        dominio.activo ? 'Dominio desactivado' : 'Dominio activado'
      );
      fetchDominios();
    } catch (error: any) {
      console.error('Error toggling dominio:', error);
      toast.error('Error al cambiar el estado del dominio');
    }
  };

  const handleModalClose = (refresh: boolean) => {
    setIsModalOpen(false);
    setEditingDominio(null);
    if (refresh) {
      fetchDominios();
    }
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
          <h1 className="text-3xl font-bold text-gray-900">Dominios</h1>
          <p className="text-gray-600 mt-1">
            Gestiona los dominios activos para el envio de correos corporativos
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Agregar Dominio
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Dominio
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Prioridad
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Usuarios Actuales
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Max. Usuarios
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha de Creacion
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {dominios.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  No hay dominios registrados. Haz clic en "Agregar Dominio" para comenzar.
                </td>
              </tr>
            ) : (
              dominios.map((dominio) => (
                <tr key={dominio.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {dominio.dominio}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleActive(dominio)}
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                        dominio.activo
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                      }`}
                    >
                      {dominio.activo ? (
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
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{dominio.prioridad}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {dominio.usuariosActuales ?? 0}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {dominio.maxUsuarios}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">
                      {new Date(dominio.createdAt).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEdit(dominio)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(dominio.id, dominio.dominio)}
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
        <DominioModal
          dominio={editingDominio}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
}
