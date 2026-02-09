'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Dominio } from '@/app/dominios/page';

interface DominioModalProps {
  dominio: Dominio | null;
  onClose: (refresh: boolean) => void;
}

interface FormData {
  dominio: string;
  activo: boolean;
  prioridad: number;
  maxUsuarios: number;
}

export default function DominioModal({ dominio, onClose }: DominioModalProps) {
  const [formData, setFormData] = useState<FormData>({
    dominio: '',
    activo: true,
    prioridad: 1,
    maxUsuarios: 3,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (dominio) {
      setFormData({
        dominio: dominio.dominio,
        activo: dominio.activo,
        prioridad: dominio.prioridad,
        maxUsuarios: dominio.maxUsuarios ?? 3,
      });
    }
  }, [dominio]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.dominio.trim()) {
      newErrors.dominio = 'El dominio es obligatorio';
    } else if (!/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.dominio)) {
      newErrors.dominio = 'Formato de dominio no valido (ej: ejemplo.com)';
    }

    if (formData.prioridad < 1) {
      newErrors.prioridad = 'La prioridad debe ser al menos 1';
    }

    if (formData.maxUsuarios < 1) {
      newErrors.maxUsuarios = 'El maximo de usuarios debe ser al menos 1';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      if (dominio) {
        await api.put(`/dominios/${dominio.id}`, formData);
        toast.success('Dominio actualizado correctamente');
      } else {
        await api.post('/dominios', formData);
        toast.success('Dominio creado correctamente');
      }
      onClose(true);
    } catch (error: any) {
      console.error('Error saving dominio:', error);
      toast.error(
        error.response?.data?.message || 'Error al guardar el dominio'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">
            {dominio ? 'Editar Dominio' : 'Nuevo Dominio'}
          </h2>
          <button
            onClick={() => onClose(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Dominio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dominio <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.dominio}
              onChange={(e) => setFormData({ ...formData, dominio: e.target.value })}
              className={`w-full px-4 py-3 border rounded-lg text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.dominio ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="ejemplo.com"
              maxLength={255}
            />
            {errors.dominio && (
              <p className="mt-1 text-sm text-red-500">{errors.dominio}</p>
            )}
          </div>

          {/* Prioridad */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prioridad
            </label>
            <input
              type="number"
              value={formData.prioridad}
              onChange={(e) =>
                setFormData({ ...formData, prioridad: parseInt(e.target.value) || 1 })
              }
              className={`w-full px-4 py-3 border rounded-lg text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.prioridad ? 'border-red-500' : 'border-gray-300'
              }`}
              min={1}
            />
            {errors.prioridad && (
              <p className="mt-1 text-sm text-red-500">{errors.prioridad}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Mayor prioridad = mayor probabilidad de ser seleccionado
            </p>
          </div>

          {/* Max Usuarios */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max. Usuarios por Dominio
            </label>
            <input
              type="number"
              value={formData.maxUsuarios}
              onChange={(e) =>
                setFormData({ ...formData, maxUsuarios: parseInt(e.target.value) || 1 })
              }
              className={`w-full px-4 py-3 border rounded-lg text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.maxUsuarios ? 'border-red-500' : 'border-gray-300'
              }`}
              min={1}
            />
            {errors.maxUsuarios && (
              <p className="mt-1 text-sm text-red-500">{errors.maxUsuarios}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Numero maximo de usuarios que se pueden crear en este dominio
            </p>
          </div>

          {/* Estado */}
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.activo}
                onChange={(e) =>
                  setFormData({ ...formData, activo: e.target.checked })
                }
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Dominio activo
              </span>
            </label>
            <p className="mt-1 text-xs text-gray-500">
              Solo los dominios activos seran utilizados para crear correos corporativos
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => onClose(false)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Guardando...' : dominio ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
