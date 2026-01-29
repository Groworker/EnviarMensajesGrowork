'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Search, Settings, Save, X, Info, AlertCircle, MapPin, Briefcase, Filter } from 'lucide-react';
import { MultiSelectInput } from '@/components/MultiSelectInput';
import toast from 'react-hot-toast';

export default function ClientsPage() {
    const [clients, setClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingClient, setEditingClient] = useState<any | null>(null);
    const [activeTab, setActiveTab] = useState<'warmup' | 'criteria'>('warmup');

    // Column filters
    const [estadoCrmFilter, setEstadoCrmFilter] = useState<string>('');
    const [estadoEnvioFilter, setEstadoEnvioFilter] = useState<string>('');
    const [warmupFilter, setWarmupFilter] = useState<string>('');

    const fetchClients = async () => {
        try {
            setLoading(true);
            const res = await api.get('/clients');
            setClients(res.data);
        } catch (error) {
            console.error('Error fetching clients', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClients();
    }, []);

    const handleEdit = (client: any) => {
        // Ensure settings object exists with field-level defaults
        const settings = {
            ...client.sendSettings,
            // Apply defaults only for missing/undefined values
            targetDailyLimit: client.sendSettings?.targetDailyLimit ?? 25,
            currentDailyLimit: client.sendSettings?.currentDailyLimit ?? 5,
            warmupDailyIncrement: client.sendSettings?.warmupDailyIncrement ?? 2,
            active: client.sendSettings?.active ?? true,
            isWarmupActive: client.sendSettings?.isWarmupActive ?? true,
            matchingCriteria: client.sendSettings?.matchingCriteria ?? {},
        };

        // Normalizar datos de Zoho (formato {values: []} a array directo)
        // Manejar tanto arrays como strings en values
        const normalizedClient = {
            ...client,
            sendSettings: settings,
            paisesInteres: Array.isArray(client.paisesInteres?.values)
                ? client.paisesInteres.values
                : typeof client.paisesInteres?.values === 'string'
                ? [client.paisesInteres.values]
                : Array.isArray(client.paisesInteres)
                ? client.paisesInteres
                : [],
            ciudadesInteres: Array.isArray(client.ciudadesInteres?.values)
                ? client.ciudadesInteres.values
                : typeof client.ciudadesInteres?.values === 'string'
                ? [client.ciudadesInteres.values]
                : Array.isArray(client.ciudadesInteres)
                ? client.ciudadesInteres
                : [],
        };

        setEditingClient(normalizedClient);
    };

    const handleSave = async () => {
        if (!editingClient) return;

        // Mostrar toast de carga
        const loadingToast = toast.loading('Guardando configuración...');

        try {
            // Solo enviar campos editables (sin id, clientId, createdAt, updatedAt)
            const settingsToUpdate = {
                currentDailyLimit: editingClient.sendSettings.currentDailyLimit,
                targetDailyLimit: editingClient.sendSettings.targetDailyLimit,
                warmupDailyIncrement: editingClient.sendSettings.warmupDailyIncrement,
                isWarmupActive: editingClient.sendSettings.isWarmupActive,
                matchingCriteria: editingClient.sendSettings.matchingCriteria,
                active: editingClient.sendSettings.active,
            };

            await api.patch(`/clients/${editingClient.id}/settings`, settingsToUpdate);

            // Cerrar toast de carga y mostrar éxito
            toast.success('Configuración guardada correctamente', {
                id: loadingToast,
                duration: 3000,
            });

            setEditingClient(null);
            fetchClients(); // Refresh list
        } catch (error: any) {
            // Cerrar toast de carga
            toast.dismiss(loadingToast);

            // Preparar mensaje de error detallado
            const errorMessage = error.response?.data?.message || error.message || 'Error desconocido';
            const errorDetails = error.response?.data?.error || '';
            const fullError = errorDetails ? `${errorMessage}\n\nDetalles: ${errorDetails}` : errorMessage;

            // Mostrar toast de error con opción de copiar
            toast.error(
                () => (
                    <div className="flex flex-col gap-2">
                        <div className="font-semibold">Error al guardar configuración</div>
                        <div className="text-sm text-gray-600 max-w-md">
                            {errorMessage}
                        </div>
                        {errorDetails && (
                            <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded max-w-md overflow-auto max-h-32">
                                {errorDetails}
                            </div>
                        )}
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(fullError);
                                toast.success('Error copiado al portapapeles', {
                                    duration: 2000,
                                });
                            }}
                            className="mt-2 px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors self-start"
                        >
                            📋 Copiar error
                        </button>
                    </div>
                ),
                {
                    duration: 8000,
                    style: {
                        maxWidth: '500px',
                    },
                }
            );

            console.error('Error saving settings:', error);
        }
    };

    const handleEstadoChange = async (clientId: number, nuevoEstado: string) => {
        const loadingToast = toast.loading(`Actualizando estado a "${nuevoEstado}"...`);

        try {
            await api.patch(`/clients/${clientId}/estado`, { estado: nuevoEstado });

            toast.success(
                `Estado actualizado correctamente a "${nuevoEstado}" y sincronizado con Zoho CRM`,
                {
                    id: loadingToast,
                    duration: 3000,
                }
            );

            // Refresh clients list to show updated estado
            fetchClients();
        } catch (error: any) {
            toast.dismiss(loadingToast);

            const errorMessage = error.response?.data?.message || error.message || 'Error desconocido';
            const errorDetails = error.response?.data?.error || '';
            const fullError = errorDetails ? `${errorMessage}\n\nDetalles: ${errorDetails}` : errorMessage;

            toast.error(
                () => (
                    <div className="flex flex-col gap-2">
                        <div className="font-semibold">Error al actualizar estado</div>
                        <div className="text-sm text-gray-600 max-w-md">
                            {errorMessage}
                        </div>
                        {errorDetails && (
                            <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded max-w-md overflow-auto max-h-32">
                                {errorDetails}
                            </div>
                        )}
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(fullError);
                                toast.success('Error copiado al portapapeles', {
                                    duration: 2000,
                                });
                            }}
                            className="mt-2 px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors self-start"
                        >
                            📋 Copiar error
                        </button>
                    </div>
                ),
                {
                    duration: 8000,
                    style: {
                        maxWidth: '500px',
                    },
                }
            );

            console.error('Error updating estado:', error);
        }
    };

    const handleToggleEnvio = async (clientId: number, currentActive: boolean) => {
        const newActive = !currentActive;
        const loadingToast = toast.loading(newActive ? 'Activando envíos...' : 'Desactivando envíos...');

        try {
            await api.patch(`/clients/${clientId}/settings`, { active: newActive });

            toast.success(
                newActive ? 'Envíos activados correctamente' : 'Envíos desactivados correctamente',
                {
                    id: loadingToast,
                    duration: 2000,
                }
            );

            fetchClients();
        } catch (error: any) {
            toast.dismiss(loadingToast);

            const errorMessage = error.response?.data?.message || error.message || 'Error desconocido';

            toast.error(`Error al cambiar estado de envío: ${errorMessage}`, {
                duration: 4000,
            });

            console.error('Error toggling envio:', error);
        }
    };

    const filteredClients = clients.filter(c => {
        // Text search filter
        const matchesSearch = searchTerm === '' ||
            c.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.zohoId?.includes(searchTerm);

        // Estado CRM filter
        const matchesEstadoCrm = estadoCrmFilter === '' || c.estado === estadoCrmFilter;

        // Estado Envío filter
        const matchesEstadoEnvio = estadoEnvioFilter === '' ||
            (estadoEnvioFilter === 'activo' && c.sendSettings?.active) ||
            (estadoEnvioFilter === 'inactivo' && !c.sendSettings?.active);

        // Warmup filter
        let matchesWarmup = true;
        if (warmupFilter !== '') {
            const settings = c.sendSettings;
            if (!settings) {
                matchesWarmup = warmupFilter === 'sin_config';
            } else {
                const progress = (settings.currentDailyLimit / settings.targetDailyLimit) * 100;
                if (warmupFilter === 'completado') {
                    matchesWarmup = progress >= 100;
                } else if (warmupFilter === 'en_progreso') {
                    matchesWarmup = progress > 0 && progress < 100;
                } else if (warmupFilter === 'sin_config') {
                    matchesWarmup = false;
                }
            }
        }

        return matchesSearch && matchesEstadoCrm && matchesEstadoEnvio && matchesWarmup;
    });

    return (
        <div className="bg-gray-50 min-h-screen p-8">
            <header className="mb-6 flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900">Gestión de Clientes</h1>
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Buscar cliente..."
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                </div>
            </header>

            {/* Filters Bar */}
            <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex flex-wrap items-center gap-4">
                    <span className="text-sm font-medium text-gray-600 flex items-center gap-1">
                        <Filter size={14} />
                        Filtros:
                    </span>

                    {/* Estado CRM Filter */}
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-700">Estado CRM:</label>
                        <select
                            value={estadoCrmFilter}
                            onChange={(e) => setEstadoCrmFilter(e.target.value)}
                            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                        >
                            <option value="">Todos</option>
                            <option value="Envío activo">Envío activo</option>
                            <option value="Entrevista">Entrevista</option>
                            <option value="Contratado">Contratado</option>
                            <option value="Cerrado">Cerrado</option>
                            <option value="Pausado">Pausado</option>
                        </select>
                    </div>

                    {/* Estado Envío Filter */}
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-700">Estado Envío:</label>
                        <select
                            value={estadoEnvioFilter}
                            onChange={(e) => setEstadoEnvioFilter(e.target.value)}
                            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                        >
                            <option value="">Todos</option>
                            <option value="activo">Activo</option>
                            <option value="inactivo">Inactivo</option>
                        </select>
                    </div>

                    {/* Warmup Filter */}
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-700">Warmup:</label>
                        <select
                            value={warmupFilter}
                            onChange={(e) => setWarmupFilter(e.target.value)}
                            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                        >
                            <option value="">Todos</option>
                            <option value="en_progreso">En progreso</option>
                            <option value="completado">Completado</option>
                            <option value="sin_config">Sin configurar</option>
                        </select>
                    </div>

                    {/* Clear Filters Button */}
                    {(estadoCrmFilter || estadoEnvioFilter || warmupFilter) && (
                        <button
                            onClick={() => {
                                setEstadoCrmFilter('');
                                setEstadoEnvioFilter('');
                                setWarmupFilter('');
                            }}
                            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition flex items-center gap-1"
                        >
                            <X size={14} />
                            Limpiar filtros
                        </button>
                    )}

                    {/* Results count */}
                    <span className="ml-auto text-sm text-gray-500">
                        {filteredClients.length} de {clients.length} clientes
                    </span>
                </div>
            </div>

            {editingClient && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                        {/* Header Fijo */}
                        <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-xl">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-blue-100 text-sm font-medium">Configuración de cliente</p>
                                    <h2 className="text-2xl font-bold text-white">{editingClient.nombre} {editingClient.apellido}</h2>
                                    <p className="text-blue-200 text-sm mt-1">{editingClient.email}</p>
                                </div>
                                <button
                                    onClick={() => setEditingClient(null)}
                                    className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-lg transition-all"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        {/* Navegación por pestañas */}
                        <div className="flex-shrink-0 flex border-b bg-gray-50 px-6">
                            <button
                                className={`px-5 py-3 font-medium transition-colors ${
                                    activeTab === 'warmup'
                                        ? 'border-b-2 border-blue-600 text-blue-600 bg-white'
                                        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                                }`}
                                onClick={() => setActiveTab('warmup')}
                            >
                                Límites y Warmup
                            </button>
                            <button
                                className={`px-5 py-3 font-medium transition-colors ${
                                    activeTab === 'criteria'
                                        ? 'border-b-2 border-blue-600 text-blue-600 bg-white'
                                        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                                }`}
                                onClick={() => setActiveTab('criteria')}
                            >
                                Criterios de Búsqueda
                            </button>
                        </div>

                        {/* Contenido Scrollable */}
                        <div className="flex-1 overflow-y-auto p-6">

                        {/* Pestaña Warmup */}
                        {activeTab === 'warmup' && (
                            <div className="space-y-6">
                                {/* Sección Estado de Envío */}
                                <div className="border-2 rounded-lg p-5 bg-gradient-to-br from-green-50 to-emerald-50 border-green-300 shadow-sm">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-bold text-green-900 flex items-center gap-2 text-base">
                                            <Settings size={20} className="text-green-600" />
                                            Estado de Envío
                                        </h3>
                                        <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
                                            editingClient.sendSettings.active
                                                ? 'bg-green-200 text-green-800'
                                                : 'bg-red-200 text-red-800'
                                        }`}>
                                            {editingClient.sendSettings.active ? '✓ Activo' : '✗ Inactivo'}
                                        </span>
                                    </div>

                                    <div className="p-4 bg-white rounded-lg border-2 border-green-200">
                                        <label className="block text-sm font-bold text-gray-800 mb-3">
                                            🔄 Estado del Sistema
                                        </label>
                                        <select
                                            className="w-full rounded-lg border-2 border-gray-300 shadow-sm p-3 bg-white text-gray-800 font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                                            value={editingClient.sendSettings.active ? 'true' : 'false'}
                                            onChange={(e) => setEditingClient({
                                                ...editingClient,
                                                sendSettings: { ...editingClient.sendSettings, active: e.target.value === 'true' }
                                            })}
                                        >
                                            <option value="true">✅ Activo - Envío de emails habilitado</option>
                                            <option value="false">🛑 Inactivo - Envío de emails pausado</option>
                                        </select>
                                        <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                                            <p className="text-xs text-green-900 leading-relaxed">
                                                <strong className="text-green-900">Activo:</strong> El sistema enviará emails automáticamente según el schedule<br/>
                                                <strong className="text-green-900">Inactivo:</strong> No se enviarán emails hasta reactivar
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Sección Configuración de Warmup */}
                                <div className="border-2 rounded-lg p-5 bg-gradient-to-br from-orange-50 to-amber-50 border-orange-300 shadow-sm">
                                    <h3 className="font-bold text-orange-900 mb-5 flex items-center gap-2 text-base">
                                        🔥 Configuración de Warmup
                                    </h3>

                                    {/* Activar/Desactivar Warmup */}
                                    <div className="p-4 bg-white rounded-lg border-2 border-orange-200 mb-4">
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500 w-5 h-5"
                                                checked={editingClient.sendSettings.isWarmupActive}
                                                onChange={(e) => setEditingClient({
                                                    ...editingClient,
                                                    sendSettings: { ...editingClient.sendSettings, isWarmupActive: e.target.checked }
                                                })}
                                            />
                                            <span className="text-sm font-bold text-gray-800">
                                                Activar incremento gradual de volumen (Warmup)
                                            </span>
                                        </label>
                                        <div className="mt-3 p-3 bg-orange-50 rounded-lg border border-orange-200 ml-8">
                                            <p className="text-xs text-orange-900 leading-relaxed">
                                                El warmup aumenta gradualmente el número de emails diarios para evitar que sean marcados como spam. Se inicia entre 3-6 emails/día y aumenta según el incremento configurado hasta alcanzar el objetivo.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Estado Actual (Solo lectura) */}
                                    <div className="p-4 bg-white rounded-lg border-2 border-orange-200 mb-4">
                                        <label className="block text-sm font-bold text-gray-800 mb-3">
                                            📊 Estado Actual
                                        </label>
                                        <div className="flex items-center gap-4">
                                            <div className="flex-1">
                                                <div className="text-2xl font-bold text-orange-600 mb-1">
                                                    {editingClient.sendSettings.currentDailyLimit} emails/día
                                                </div>
                                                <div className="text-xs text-gray-600">
                                                    Límite actual de envío
                                                </div>
                                            </div>
                                            <div className="text-gray-400 text-xl">→</div>
                                            <div className="flex-1 text-right">
                                                <div className="text-2xl font-bold text-orange-800 mb-1">
                                                    {editingClient.sendSettings.targetDailyLimit} emails/día
                                                </div>
                                                <div className="text-xs text-gray-600">
                                                    Objetivo final
                                                </div>
                                            </div>
                                        </div>

                                        {/* Barra de progreso */}
                                        <div className="mt-4">
                                            <div className="flex justify-between text-xs text-gray-600 mb-1">
                                                <span>Progreso del Warmup</span>
                                                <span>
                                                    {Math.round((editingClient.sendSettings.currentDailyLimit / editingClient.sendSettings.targetDailyLimit) * 100)}%
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                                <div
                                                    className="bg-gradient-to-r from-orange-400 to-orange-600 h-3 rounded-full transition-all duration-300"
                                                    style={{
                                                        width: `${Math.min(100, (editingClient.sendSettings.currentDailyLimit / editingClient.sendSettings.targetDailyLimit) * 100)}%`
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                            <p className="text-xs text-blue-900">
                                                {editingClient.sendSettings.currentDailyLimit >= editingClient.sendSettings.targetDailyLimit ? (
                                                    <span className="font-medium">✓ Warmup completado. Se mantiene en {editingClient.sendSettings.targetDailyLimit} emails/día.</span>
                                                ) : editingClient.sendSettings.isWarmupActive ? (
                                                    <span>El límite actual aumentará automáticamente cada día en <strong>{editingClient.sendSettings.warmupDailyIncrement} emails</strong> hasta alcanzar el objetivo.</span>
                                                ) : (
                                                    <span className="text-gray-600">Warmup desactivado. El límite se mantiene fijo en {editingClient.sendSettings.currentDailyLimit} emails/día.</span>
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        {/* Objetivo Diario */}
                                        <div className="p-4 bg-white rounded-lg border-2 border-orange-200">
                                            <label className="block text-sm font-bold text-gray-800 mb-3">
                                                🎯 Objetivo Diario (Target)
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="1000"
                                                className="w-full rounded-lg border-2 border-gray-300 shadow-sm p-3 bg-white text-gray-800 font-medium focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                                                value={editingClient.sendSettings.targetDailyLimit}
                                                onChange={(e) => setEditingClient({
                                                    ...editingClient,
                                                    sendSettings: { ...editingClient.sendSettings, targetDailyLimit: parseInt(e.target.value) || 25 }
                                                })}
                                            />
                                            <div className="mt-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                                                <p className="text-xs text-orange-900">
                                                    Meta de emails diarios que se quiere alcanzar. <strong>Default: 25 emails/día.</strong> El warmup aumentará gradualmente el límite actual hasta llegar a este objetivo.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Incremento Diario */}
                                        <div className="p-4 bg-white rounded-lg border-2 border-orange-200">
                                            <label className="block text-sm font-bold text-gray-800 mb-3">
                                                📈 Incremento Diario
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="20"
                                                className="w-full rounded-lg border-2 border-gray-300 shadow-sm p-3 bg-white text-gray-800 font-medium focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                                                value={editingClient.sendSettings.warmupDailyIncrement}
                                                onChange={(e) => setEditingClient({
                                                    ...editingClient,
                                                    sendSettings: { ...editingClient.sendSettings, warmupDailyIncrement: parseInt(e.target.value) || 2 }
                                                })}
                                            />
                                            <div className="mt-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                                                <p className="text-xs text-orange-900">
                                                    Cantidad de emails que se añadirán cada día durante el warmup. <strong>Default: 2 emails/día.</strong> Ejemplo: si hoy se envían 10 emails e incremento es 2, mañana se enviarán 12.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Pestaña Criterios (NUEVO) */}
                        {activeTab === 'criteria' && (
                            <div className="space-y-6">
                                {/* Sección Datos del Cliente (SOLO LECTURA - vienen de Zoho) */}
                                <div className="border-2 rounded-lg p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-300 shadow-sm">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-bold text-blue-900 flex items-center gap-2 text-base">
                                            <Info size={20} className="text-blue-600" />
                                            Datos del Cliente (desde Zoho CRM)
                                        </h3>
                                        <span className="text-xs font-semibold text-blue-800 bg-blue-200 px-3 py-1.5 rounded-full">
                                            🔒 Solo lectura
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-5">
                                        {/* Países */}
                                        <div>
                                            <label className="block text-sm font-bold text-gray-800 mb-2">
                                                📍 Países de Interés
                                            </label>
                                            <div className="min-h-[42px] p-2 bg-white rounded-lg border-2 border-blue-200">
                                                <MultiSelectInput
                                                    values={editingClient.paisesInteres || []}
                                                    onChange={() => {}}
                                                    disabled={true}
                                                />
                                                {(!editingClient.paisesInteres || editingClient.paisesInteres.length === 0) && (
                                                    <span className="text-gray-400 text-sm italic">Sin países configurados</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Ciudades */}
                                        <div>
                                            <label className="block text-sm font-bold text-gray-800 mb-2">
                                                🏙️ Ciudades de Interés
                                            </label>
                                            <div className="min-h-[42px] p-2 bg-white rounded-lg border-2 border-blue-200">
                                                <MultiSelectInput
                                                    values={editingClient.ciudadesInteres || []}
                                                    onChange={() => {}}
                                                    disabled={true}
                                                />
                                                {(!editingClient.ciudadesInteres || editingClient.ciudadesInteres.length === 0) && (
                                                    <span className="text-gray-400 text-sm italic">Sin ciudades configuradas</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Job Title */}
                                        <div className="col-span-2">
                                            <label className="block text-sm font-bold text-gray-800 mb-2">
                                                💼 Puesto Deseado
                                            </label>
                                            <input
                                                type="text"
                                                className="w-full rounded-lg border-2 border-blue-200 bg-white shadow-sm p-3 text-gray-800 font-medium"
                                                value={editingClient.jobTitle || 'No especificado'}
                                                disabled
                                                readOnly
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-4 p-3 bg-blue-100 rounded-lg border border-blue-300">
                                        <p className="text-sm text-blue-900 flex items-center gap-2 font-medium">
                                            <AlertCircle size={16} className="flex-shrink-0" />
                                            Estos datos se sincronizan automáticamente desde Zoho CRM y no se pueden editar aquí.
                                        </p>
                                    </div>
                                </div>

                                {/* Sección Filtros Activos - SEGUNDA POSICIÓN */}
                                <div className="border-2 rounded-lg p-5 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-300 shadow-sm">
                                    <h3 className="font-bold text-purple-900 mb-5 flex items-center gap-2 text-base">
                                        <Settings size={20} className="text-purple-700" />
                                        Filtros Activos
                                    </h3>

                                    <div className="p-4 bg-white rounded-lg border-2 border-purple-200">
                                        <label className="block text-sm font-bold text-gray-800 mb-3">
                                            ⚙️ Seleccionar Filtros
                                        </label>
                                        <div className="space-y-3">
                                            {['countries', 'cities', 'jobTitle'].map((filter) => {
                                                const currentFilters = editingClient.sendSettings?.matchingCriteria?.enabledFilters || [];
                                                const isChecked = currentFilters.length === 0 || currentFilters.includes(filter);

                                                return (
                                                    <label key={filter} className="flex items-center gap-3 p-2 hover:bg-purple-50 rounded-lg cursor-pointer transition-colors">
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={(e) => {
                                                                let updated: string[];
                                                                if (currentFilters.length === 0) {
                                                                    updated = ['countries', 'cities', 'jobTitle'].filter(f => f !== filter || e.target.checked);
                                                                } else {
                                                                    updated = e.target.checked
                                                                        ? [...currentFilters, filter]
                                                                        : currentFilters.filter((f: string) => f !== filter);
                                                                }

                                                                const newSettings = {
                                                                    ...editingClient.sendSettings,
                                                                    matchingCriteria: {
                                                                        ...editingClient.sendSettings?.matchingCriteria,
                                                                        enabledFilters: updated,
                                                                    },
                                                                };
                                                                setEditingClient({ ...editingClient, sendSettings: newSettings });
                                                            }}
                                                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 w-5 h-5"
                                                        />
                                                        <span className="text-sm text-gray-800 font-medium">
                                                            {filter === 'countries' ? '📍 Países' :
                                                             filter === 'cities' ? '🏙️ Ciudades' :
                                                             '💼 Puesto de Trabajo'}
                                                        </span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                        <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                                            <p className="text-xs text-purple-900 font-medium">
                                                💡 Desmarcar un filtro lo desactiva temporalmente sin borrar los datos del cliente
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Sección Configuración de Matching */}
                                <div className="border-2 rounded-lg p-5 bg-gradient-to-br from-gray-50 to-slate-50 border-gray-300 shadow-sm">
                                    <h3 className="font-bold text-gray-900 mb-5 flex items-center gap-2 text-base">
                                        <Settings size={20} className="text-gray-700" />
                                        Configuración de Búsqueda
                                    </h3>

                                    {/* Match Mode */}
                                    <div className="mb-5 p-4 bg-white rounded-lg border-2 border-gray-200">
                                        <label className="block text-sm font-bold text-gray-800 mb-3">
                                            🎯 Modo de Coincidencia
                                        </label>
                                        <select
                                            className="w-full rounded-lg border-2 border-gray-300 shadow-sm p-3 bg-white text-gray-800 font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                                            value={editingClient.sendSettings?.matchingCriteria?.matchMode || 'all'}
                                            onChange={(e) => {
                                                const newSettings = {
                                                    ...editingClient.sendSettings,
                                                    matchingCriteria: {
                                                        ...editingClient.sendSettings?.matchingCriteria,
                                                        matchMode: e.target.value,
                                                    },
                                                };
                                                setEditingClient({ ...editingClient, sendSettings: newSettings });
                                            }}
                                        >
                                            <option value="all">✅ Todas las condiciones (AND)</option>
                                            <option value="any">🔀 Cualquier condición (OR)</option>
                                        </select>
                                        <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                            <p className="text-xs text-gray-700 leading-relaxed">
                                                <strong className="text-gray-900">AND:</strong> La oferta debe cumplir <strong>TODOS</strong> los criterios configurados<br/>
                                                <strong className="text-gray-900">OR:</strong> Basta con que cumpla <strong>UNO</strong> de los criterios
                                            </p>
                                        </div>
                                    </div>

                                    {/* Job Title Match Mode - Solo visible si jobTitle está activo */}
                                    {(() => {
                                        const currentFilters = editingClient.sendSettings?.matchingCriteria?.enabledFilters || [];
                                        const isJobTitleEnabled = currentFilters.length === 0 || currentFilters.includes('jobTitle');

                                        return isJobTitleEnabled ? (
                                            <div className="p-4 bg-white rounded-lg border-2 border-gray-200">
                                                <label className="block text-sm font-bold text-gray-800 mb-3">
                                                    🔍 Modo de Búsqueda de Puesto
                                                </label>
                                                <select
                                                    className="w-full rounded-lg border-2 border-gray-300 shadow-sm p-3 bg-white text-gray-800 font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                                                    value={editingClient.sendSettings?.matchingCriteria?.jobTitleMatchMode || 'contains'}
                                                    onChange={(e) => {
                                                        const newSettings = {
                                                            ...editingClient.sendSettings,
                                                            matchingCriteria: {
                                                                ...editingClient.sendSettings?.matchingCriteria,
                                                                jobTitleMatchMode: e.target.value,
                                                            },
                                                        };
                                                        setEditingClient({ ...editingClient, sendSettings: newSettings });
                                                    }}
                                                >
                                                    <option value="contains">🔎 Contiene (recomendado)</option>
                                                    <option value="exact">🎯 Exacto</option>
                                                </select>
                                                <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                                    <p className="text-xs text-gray-700 leading-relaxed">
                                                        <strong className="text-gray-900">Contiene:</strong> Busca ofertas que contengan el puesto<br/>
                                                        <span className="text-gray-600 italic">Ej: "Chef" encuentra "Chef de Cocina", "Sous Chef"</span><br/>
                                                        <strong className="text-gray-900 mt-1 inline-block">Exacto:</strong> Solo ofertas con el mismo puesto exacto
                                                    </p>
                                                </div>
                                            </div>
                                        ) : null;
                                    })()}
                                </div>
                            </div>
                        )}

                        </div>
                        {/* Fin Contenido Scrollable */}

                        {/* Footer Fijo con Botones */}
                        <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex justify-end gap-3">
                            <button
                                onClick={() => setEditingClient(null)}
                                className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 font-medium transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-5 py-2.5 text-white bg-blue-600 rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2 transition-colors shadow-sm"
                            >
                                <Save size={18} />
                                Guardar Cambios
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-3 font-medium text-gray-500">Info Cliente</th>
                            <th className="px-6 py-3 font-medium text-gray-500">Estado CRM</th>
                            <th className="px-6 py-3 font-medium text-gray-500">Estado Envío</th>
                            <th className="px-6 py-3 font-medium text-gray-500">Warmup (Act / Obj)</th>
                            <th className="px-6 py-3 font-medium text-gray-500">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                                        <span>Cargando clientes...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : filteredClients.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                    <div className="flex flex-col items-center gap-2">
                                        <Filter size={32} className="text-gray-300" />
                                        <span className="font-medium">No se encontraron clientes</span>
                                        <span className="text-sm">
                                            {(searchTerm || estadoCrmFilter || estadoEnvioFilter || warmupFilter)
                                                ? 'Intenta ajustar los filtros de búsqueda'
                                                : 'No hay clientes registrados'}
                                        </span>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredClients.map((client) => {
                                const settings = client.sendSettings;
                                return (
                                    <tr key={client.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{client.nombre} {client.apellido}</div>
                                            <div className="text-sm text-gray-500">{client.email}</div>
                                            <div className="text-xs text-gray-400 font-mono">{client.zohoId}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                value={client.estado || 'Envío activo'}
                                                onChange={(e) => handleEstadoChange(client.id, e.target.value)}
                                                className={`px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                                    client.estado === 'Envío activo' ? 'bg-green-50 border-green-200 text-green-800' :
                                                    client.estado === 'Entrevista' ? 'bg-blue-50 border-blue-200 text-blue-800' :
                                                    client.estado === 'Contratado' ? 'bg-purple-50 border-purple-200 text-purple-800' :
                                                    client.estado === 'Cerrado' ? 'bg-red-50 border-red-200 text-red-800' :
                                                    client.estado === 'Pausado' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
                                                    'bg-gray-50 border-gray-200 text-gray-800'
                                                }`}
                                            >
                                                <option value="Envío activo">Envío activo</option>
                                                <option value="Entrevista">Entrevista</option>
                                                <option value="Contratado">Contratado</option>
                                                <option value="Cerrado">Cerrado</option>
                                                <option value="Pausado">Pausado</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => handleToggleEnvio(client.id, settings?.active ?? false)}
                                                className="flex items-center gap-3 cursor-pointer"
                                                title={settings?.active ? 'Click para desactivar envíos' : 'Click para activar envíos'}
                                            >
                                                {/* Toggle Switch */}
                                                <div
                                                    className="relative inline-block w-12 h-7 rounded-full transition-all duration-300 ease-in-out"
                                                    style={{
                                                        backgroundColor: settings?.active ? '#22c55e' : '#d1d5db',
                                                    }}
                                                >
                                                    <div
                                                        className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 ease-in-out"
                                                        style={{
                                                            left: settings?.active ? '26px' : '4px',
                                                        }}
                                                    />
                                                </div>
                                            </button>
                                        </td>
                                        <td className="px-6 py-4">
                                            {settings ? (
                                                <div className="flex items-center gap-3">
                                                    <div className="w-20 h-2.5 bg-gray-200 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-blue-500 rounded-full"
                                                            style={{ width: `${Math.min((settings.currentDailyLimit / settings.targetDailyLimit) * 100, 100)}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-sm font-semibold text-gray-800">
                                                        {settings.currentDailyLimit} / {settings.targetDailyLimit}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-gray-500 italic text-sm">Sin config</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => handleEdit(client)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                            >
                                                <Settings size={20} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
