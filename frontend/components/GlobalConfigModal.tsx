'use client';

import { useState, useEffect } from 'react';
import { X, Clock, Timer, Power, Save } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface GlobalConfig {
    id: number;
    startHour: number;
    endHour: number;
    minDelayMinutes: number;
    maxDelayMinutes: number;
    enabled: boolean;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export default function GlobalConfigModal({ isOpen, onClose }: Props) {
    const [config, setConfig] = useState<GlobalConfig | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadConfig();
        }
    }, [isOpen]);

    const loadConfig = async () => {
        setLoading(true);
        try {
            const res = await api.get('/global-config');
            setConfig(res.data);
        } catch (error) {
            toast.error('Error al cargar configuración');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Format number with leading zeros
    const formatTimeValue = (value: number, digits: number = 2) => {
        return value.toString().padStart(digits, '0');
    };

    const handleSave = async () => {
        if (!config) return;

        // Validations
        if (config.endHour <= config.startHour) {
            toast.error('La hora de fin debe ser mayor que la hora de inicio');
            return;
        }

        if (config.maxDelayMinutes < config.minDelayMinutes) {
            toast.error('El delay máximo debe ser mayor o igual al mínimo');
            return;
        }

        setSaving(true);
        const loadingToast = toast.loading('Guardando configuración...');
        try {
            // Send only editable fields, not id or updatedAt
            const payload = {
                startHour: config.startHour,
                endHour: config.endHour,
                minDelayMinutes: config.minDelayMinutes,
                maxDelayMinutes: config.maxDelayMinutes,
                enabled: config.enabled,
            };
            const res = await api.put('/global-config', payload);
            setConfig(res.data);
            toast.success('Configuración guardada correctamente', {
                id: loadingToast,
            });
            onClose();
        } catch (error: any) {
            toast.error(
                error.response?.data?.message || 'Error al guardar configuración',
                { id: loadingToast }
            );
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-gray-900">
                            Configuración Global de Envíos
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition"
                        >
                            <X size={24} />
                        </button>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                        Esta configuración afecta a todos los clientes con envío automático
                    </p>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                            <span className="ml-3 text-gray-600">Cargando...</span>
                        </div>
                    ) : config ? (
                        <div className="space-y-6">
                            {/* Enable/Disable */}
                            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                                <div className="flex items-center gap-3">
                                    <Power
                                        size={24}
                                        className={config.enabled ? 'text-blue-600' : 'text-gray-400'}
                                    />
                                    <div>
                                        <div className="font-medium text-gray-900">
                                            {config.enabled ? 'Restricciones Activas' : 'Restricciones Desactivadas'}
                                        </div>
                                        <div className="text-sm text-gray-600">
                                            {config.enabled
                                                ? 'El sistema respeta horarios y delays configurados'
                                                : 'Envío 24/7 sin delays (no recomendado)'}
                                        </div>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={config.enabled}
                                        onChange={(e) =>
                                            setConfig({ ...config, enabled: e.target.checked })
                                        }
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>

                            {/* Sending Hours */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <Clock size={20} className="text-blue-600" />
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        Horario de Envío
                                    </h3>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Hora de Inicio
                                        </label>
                                        <input
                                            type="text"
                                            pattern="[0-9]*"
                                            value={formatTimeValue(config.startHour)}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/\D/g, '');
                                                const num = val === '' ? 0 : parseInt(val);
                                                if (num >= 0 && num <= 23) {
                                                    setConfig({
                                                        ...config,
                                                        startHour: num,
                                                    });
                                                }
                                            }}
                                            disabled={!config.enabled}
                                            className="w-full px-4 py-3 text-lg font-semibold text-gray-900 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors text-center"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            {formatTimeValue(config.startHour)}:00 (formato 24h)
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Hora de Fin
                                        </label>
                                        <input
                                            type="text"
                                            pattern="[0-9]*"
                                            value={formatTimeValue(config.endHour)}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/\D/g, '');
                                                const num = val === '' ? 0 : parseInt(val);
                                                if (num >= 0 && num <= 23) {
                                                    setConfig({
                                                        ...config,
                                                        endHour: num,
                                                    });
                                                }
                                            }}
                                            disabled={!config.enabled}
                                            className="w-full px-4 py-3 text-lg font-semibold text-gray-900 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors text-center"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            {formatTimeValue(config.endHour)}:00 (formato 24h)
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Delay Configuration */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <Timer size={20} className="text-purple-600" />
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        Delay Entre Correos
                                    </h3>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Delay Mínimo
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                pattern="[0-9]*"
                                                value={formatTimeValue(config.minDelayMinutes, 2)}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/\D/g, '');
                                                    const num = val === '' ? 0 : parseInt(val);
                                                    if (num >= 0 && num <= 999) {
                                                        setConfig({
                                                            ...config,
                                                            minDelayMinutes: num,
                                                        });
                                                    }
                                                }}
                                                disabled={!config.enabled}
                                                className="w-full px-4 py-3 pr-12 text-lg font-semibold text-gray-900 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors text-center"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">min</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Delay Máximo
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                pattern="[0-9]*"
                                                value={formatTimeValue(config.maxDelayMinutes, 2)}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/\D/g, '');
                                                    const num = val === '' ? 0 : parseInt(val);
                                                    if (num >= 0 && num <= 999) {
                                                        setConfig({
                                                            ...config,
                                                            maxDelayMinutes: num,
                                                        });
                                                    }
                                                }}
                                                disabled={!config.enabled}
                                                className="w-full px-4 py-3 pr-12 text-lg font-semibold text-gray-900 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors text-center"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">min</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                                    <p className="text-sm text-purple-900">
                                        <strong>Delay aleatorio:</strong> Entre {config.minDelayMinutes}min y{' '}
                                        {config.maxDelayMinutes}min para simular comportamiento humano
                                    </p>
                                </div>
                            </div>

                            {/* Info Card */}
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <h4 className="font-medium text-gray-900 mb-2">
                                    ℹ️ Información
                                </h4>
                                <ul className="text-sm text-gray-600 space-y-1">
                                    <li>
                                        • <strong>Horario:</strong> {config.startHour}:00 - {config.endHour}:00
                                    </li>
                                    <li>
                                        • <strong>Delay promedio:</strong>{' '}
                                        {((config.minDelayMinutes + config.maxDelayMinutes) / 2).toFixed(1)}min
                                    </li>
                                    <li>
                                        • <strong>Capacidad estimada:</strong>{' '}
                                        {Math.floor(
                                            ((config.endHour - config.startHour) * 60) /
                                            ((config.minDelayMinutes + config.maxDelayMinutes) / 2)
                                        )}{' '}
                                        correos/día
                                    </li>
                                </ul>
                            </div>
                        </div>
                    ) : null}
                </div>

                {/* Footer */}
                <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 font-medium"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || loading}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                    >
                        <Save size={18} />
                        {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </div>
        </div>
    );
}
