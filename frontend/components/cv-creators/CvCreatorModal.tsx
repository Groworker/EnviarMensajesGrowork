'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { CvCreator } from '@/app/cv-creators/page';

interface CvCreatorModalProps {
  creator: CvCreator | null;
  onClose: (refresh: boolean) => void;
}

interface FormData {
  nombre: string;
  email: string;
  ingles: boolean;
  aleman: boolean;
  frances: boolean;
  italiano: boolean;
  activo: boolean;
  notas: string;
}

export default function CvCreatorModal({ creator, onClose }: CvCreatorModalProps) {
  const [formData, setFormData] = useState<FormData>({
    nombre: '',
    email: '',
    ingles: false,
    aleman: false,
    frances: false,
    italiano: false,
    activo: true,
    notas: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (creator) {
      setFormData({
        nombre: creator.nombre,
        email: creator.email,
        ingles: creator.ingles,
        aleman: creator.aleman,
        frances: creator.frances,
        italiano: creator.italiano,
        activo: creator.activo,
        notas: creator.notas || '',
      });
    }
  }, [creator]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es obligatorio';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'El email es obligatorio';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'El email no es válido';
    }

    if (!formData.ingles && !formData.aleman && !formData.frances && !formData.italiano) {
      newErrors.idiomas = 'Debe seleccionar al menos un idioma';
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
      if (creator) {
        await api.put(`/cv-creators/${creator.id}`, formData);
        toast.success('Creador de CV actualizado correctamente');
      } else {
        await api.post('/cv-creators', formData);
        toast.success('Creador de CV creado correctamente');
      }
      onClose(true);
    } catch (error: any) {
      console.error('Error saving creator:', error);
      toast.error(
        error.response?.data?.message || 'Error al guardar el creador de CV'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">
            {creator ? 'Editar Creador de CV' : 'Nuevo Creador de CV'}
          </h2>
          <button
            onClick={() => onClose(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.nombre ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Nombre del creador"
              maxLength={100}
            />
            {errors.nombre && (
              <p className="mt-1 text-sm text-red-500">{errors.nombre}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="email@ejemplo.com"
              maxLength={255}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-500">{errors.email}</p>
            )}
          </div>

          {/* Idiomas */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Idiomas <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.ingles}
                  onChange={(e) =>
                    setFormData({ ...formData, ingles: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-900">🇬🇧 Inglés</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.aleman}
                  onChange={(e) =>
                    setFormData({ ...formData, aleman: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-900">🇩🇪 Alemán</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.frances}
                  onChange={(e) =>
                    setFormData({ ...formData, frances: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-900">🇫🇷 Francés</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.italiano}
                  onChange={(e) =>
                    setFormData({ ...formData, italiano: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-900">🇮🇹 Italiano</span>
              </label>
            </div>
            {errors.idiomas && (
              <p className="mt-2 text-sm text-red-500">{errors.idiomas}</p>
            )}
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
              <span className="text-sm font-semibold text-gray-900">
                Creador activo
              </span>
            </label>
            <p className="mt-1 text-xs text-gray-600">
              Solo los creadores activos aparecerán disponibles en los workflows
            </p>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Notas
            </label>
            <textarea
              value={formData.notas}
              onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Notas adicionales (opcional)"
              rows={3}
            />
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
              {loading ? 'Guardando...' : creator ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
