'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Plus, Pencil, Trash2, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import CvCreatorModal from '@/components/cv-creators/CvCreatorModal';

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

export default function CvCreatorsPage() {
  const [creators, setCreators] = useState<CvCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCreator, setEditingCreator] = useState<CvCreator | null>(null);

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

  useEffect(() => {
    fetchCreators();
  }, []);

  const handleAdd = () => {
    setEditingCreator(null);
    setIsModalOpen(true);
  };

  const handleEdit = (creator: CvCreator) => {
    setEditingCreator(creator);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number, nombre: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar a ${nombre}?`)) {
      return;
    }

    try {
      await api.delete(`/cv-creators/${id}`);
      toast.success('Creador de CV eliminado correctamente');
      fetchCreators();
    } catch (error: any) {
      console.error('Error deleting creator:', error);
      toast.error('Error al eliminar el creador de CV');
    }
  };

  const handleModalClose = (refresh: boolean) => {
    setIsModalOpen(false);
    setEditingCreator(null);
    if (refresh) {
      fetchCreators();
    }
  };

  const getLanguageIcons = (creator: CvCreator) => {
    const languages = [];
    if (creator.ingles) languages.push('🇬🇧 Inglés');
    if (creator.aleman) languages.push('🇩🇪 Alemán');
    if (creator.frances) languages.push('🇫🇷 Francés');
    if (creator.italiano) languages.push('🇮🇹 Italiano');
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
                  No hay creadores de CV registrados. Haz clic en "Agregar Creador" para comenzar.
                </td>
              </tr>
            ) : (
              creators.map((creator) => (
                <tr key={creator.id} className="hover:bg-gray-50">
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
                        onClick={() => handleEdit(creator)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(creator.id, creator.nombre)}
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
    </div>
  );
}
