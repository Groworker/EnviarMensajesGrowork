'use client';

import React, { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import {
  Search,
  Filter,
  X,
  RefreshCw,
  Mail,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Clock,
  User,
  Briefcase,
  RotateCcw,
  Check,
  Inbox,
} from 'lucide-react';
import { ClassificationBadge } from '@/components/ClassificationBadge';
import toast from 'react-hot-toast';

type Classification =
  | 'negativa'
  | 'automatica'
  | 'entrevista'
  | 'mas_informacion'
  | 'contratado'
  | 'sin_clasificar';

interface EmailResponse {
  id: number;
  emailSendId: number;
  gmailMessageId: string;
  gmailThreadId: string;
  fromEmail: string;
  subject: string;
  bodyText: string | null;
  bodyHtml: string | null;
  classification: Classification;
  classificationConfidence: number | null;
  classificationReasoning: string | null;
  isRead: boolean;
  receivedAt: string;
  classifiedAt: string | null;
  emailSend?: {
    id: number;
    recipientEmail: string;
    recipientName: string;
    subjectSnapshot: string;
    client?: {
      id: number;
      nombre: string;
      apellido: string;
      email: string;
    };
    jobOffer?: {
      id: number;
      titulo: string;
      empresa: string;
    };
  };
}

interface ResponseStats {
  total: number;
  unread: number;
  byClassification: Record<Classification, number>;
}

interface Client {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
}

export default function ResponsesPage() {
  const [responses, setResponses] = useState<EmailResponse[]>([]);
  const [stats, setStats] = useState<ResponseStats | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [clientFilter, setClientFilter] = useState<string>('');
  const [classificationFilter, setClassificationFilter] = useState<string>('');
  const [readFilter, setReadFilter] = useState<string>('');

  // Detail modal
  const [selectedResponse, setSelectedResponse] = useState<EmailResponse | null>(null);
  const [threadData, setThreadData] = useState<{
    originalEmail: any;
    responses: EmailResponse[];
  } | null>(null);
  const [loadingThread, setLoadingThread] = useState(false);

  // Expanded rows
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const fetchResponses = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (clientFilter) params.append('clientId', clientFilter);
      if (classificationFilter) params.append('classification', classificationFilter);
      if (readFilter) params.append('isRead', readFilter);
      params.append('limit', '100');

      const res = await api.get(`/email-responses?${params.toString()}`);
      setResponses(res.data);
    } catch (error) {
      console.error('Error fetching responses:', error);
      toast.error('Error al cargar las respuestas');
    } finally {
      setLoading(false);
    }
  }, [clientFilter, classificationFilter, readFilter]);

  const fetchStats = async () => {
    try {
      const params = clientFilter ? `?clientId=${clientFilter}` : '';
      const res = await api.get(`/email-responses/stats${params}`);
      setStats(res.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await api.get('/clients');
      setClients(res.data);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    fetchResponses();
    fetchStats();
  }, [fetchResponses]);

  const handleSync = async () => {
    setSyncing(true);
    const loadingToast = toast.loading('Sincronizando respuestas...');
    try {
      await api.post('/email-responses/sync');
      toast.success('Sincronización iniciada en segundo plano', { id: loadingToast });
      // Wait a bit and refresh
      setTimeout(() => {
        fetchResponses();
        fetchStats();
      }, 3000);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al sincronizar', { id: loadingToast });
    } finally {
      setSyncing(false);
    }
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await api.patch(`/email-responses/${id}/read`);
      setResponses((prev) =>
        prev.map((r) => (r.id === id ? { ...r, isRead: true } : r))
      );
      if (stats) {
        setStats({ ...stats, unread: Math.max(0, stats.unread - 1) });
      }
      toast.success('Marcado como leído');
    } catch (error) {
      toast.error('Error al marcar como leído');
    }
  };

  const handleMarkAsUnread = async (id: number) => {
    try {
      await api.patch(`/email-responses/${id}/unread`);
      setResponses((prev) =>
        prev.map((r) => (r.id === id ? { ...r, isRead: false } : r))
      );
      if (stats) {
        setStats({ ...stats, unread: stats.unread + 1 });
      }
      toast.success('Marcado como no leído');
    } catch (error) {
      toast.error('Error al marcar como no leído');
    }
  };

  const handleReclassify = async (id: number) => {
    const loadingToast = toast.loading('Reclasificando con IA...');
    try {
      const res = await api.post(`/email-responses/${id}/reclassify`);
      setResponses((prev) =>
        prev.map((r) => (r.id === id ? res.data : r))
      );
      toast.success(
        `Reclasificado como "${res.data.classification}" (${Math.round(res.data.classificationConfidence * 100)}%)`,
        { id: loadingToast }
      );
      fetchStats();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al reclasificar', { id: loadingToast });
    }
  };

  const handleUpdateClassification = async (id: number, classification: Classification) => {
    try {
      const res = await api.patch(`/email-responses/${id}/classification`, { classification });
      setResponses((prev) =>
        prev.map((r) => (r.id === id ? res.data : r))
      );
      toast.success(`Clasificación actualizada a "${classification}"`);
      fetchStats();
    } catch (error) {
      toast.error('Error al actualizar clasificación');
    }
  };

  const handleViewThread = async (response: EmailResponse) => {
    setSelectedResponse(response);
    setLoadingThread(true);
    try {
      const res = await api.get(`/email-responses/${response.id}/thread`);
      setThreadData(res.data);
      // Mark as read if not already
      if (!response.isRead) {
        handleMarkAsRead(response.id);
      }
    } catch (error) {
      toast.error('Error al cargar la conversación');
    } finally {
      setLoadingThread(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    const loadingToast = toast.loading('Marcando todas como leídas...');
    try {
      const params = clientFilter ? `?clientId=${clientFilter}` : '';
      const res = await api.patch(`/email-responses/mark-all-read${params}`);
      toast.success(`${res.data.updated} respuestas marcadas como leídas`, { id: loadingToast });
      fetchResponses();
      fetchStats();
    } catch (error) {
      toast.error('Error al marcar como leídas', { id: loadingToast });
    }
  };

  const toggleRowExpanded = (id: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredResponses = responses.filter((r) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.subject?.toLowerCase().includes(term) ||
      r.fromEmail?.toLowerCase().includes(term) ||
      r.emailSend?.client?.nombre?.toLowerCase().includes(term) ||
      r.emailSend?.client?.apellido?.toLowerCase().includes(term) ||
      r.emailSend?.jobOffer?.empresa?.toLowerCase().includes(term)
    );
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const classificationOptions: Classification[] = [
    'negativa',
    'automatica',
    'entrevista',
    'mas_informacion',
    'contratado',
    'sin_clasificar',
  ];

  return (
    <div className="bg-gray-50 min-h-screen p-8">
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Respuestas de Email</h1>
            <p className="text-gray-600 mt-1">
              Gestiona y clasifica las respuestas recibidas
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
              Sincronizar
            </button>
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar respuestas..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            </div>
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">Total</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-blue-200 shadow-sm">
            <div className="text-2xl font-bold text-blue-600">{stats.unread}</div>
            <div className="text-sm text-gray-600">Sin Leer</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-green-200 shadow-sm">
            <div className="text-2xl font-bold text-green-600">
              {stats.byClassification.entrevista}
            </div>
            <div className="text-sm text-gray-600">Entrevistas</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-purple-200 shadow-sm">
            <div className="text-2xl font-bold text-purple-600">
              {stats.byClassification.contratado}
            </div>
            <div className="text-sm text-gray-600">Contratados</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-blue-200 shadow-sm">
            <div className="text-2xl font-bold text-blue-600">
              {stats.byClassification.mas_informacion}
            </div>
            <div className="text-sm text-gray-600">Más Info</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-red-200 shadow-sm">
            <div className="text-2xl font-bold text-red-600">
              {stats.byClassification.negativa}
            </div>
            <div className="text-sm text-gray-600">Negativas</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <div className="text-2xl font-bold text-gray-600">
              {stats.byClassification.automatica}
            </div>
            <div className="text-sm text-gray-600">Automáticas</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-yellow-200 shadow-sm">
            <div className="text-2xl font-bold text-yellow-600">
              {stats.byClassification.sin_clasificar}
            </div>
            <div className="text-sm text-gray-600">Pendientes</div>
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm font-medium text-gray-600 flex items-center gap-1">
            <Filter size={14} />
            Filtros:
          </span>

          {/* Client Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Cliente:</label>
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
            >
              <option value="">Todos</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.nombre} {client.apellido}
                </option>
              ))}
            </select>
          </div>

          {/* Classification Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Clasificación:</label>
            <select
              value={classificationFilter}
              onChange={(e) => setClassificationFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
            >
              <option value="">Todas</option>
              <option value="entrevista">Entrevista</option>
              <option value="contratado">Contratado</option>
              <option value="mas_informacion">Más Información</option>
              <option value="negativa">Negativa</option>
              <option value="automatica">Automática</option>
              <option value="sin_clasificar">Sin Clasificar</option>
            </select>
          </div>

          {/* Read Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Estado:</label>
            <select
              value={readFilter}
              onChange={(e) => setReadFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
            >
              <option value="">Todos</option>
              <option value="false">No leídos</option>
              <option value="true">Leídos</option>
            </select>
          </div>

          {/* Clear Filters */}
          {(clientFilter || classificationFilter || readFilter || searchTerm) && (
            <button
              onClick={() => {
                setClientFilter('');
                setClassificationFilter('');
                setReadFilter('');
                setSearchTerm('');
              }}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition flex items-center gap-1"
            >
              <X size={14} />
              Limpiar filtros
            </button>
          )}

          {/* Mark All as Read */}
          {stats && stats.unread > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="ml-auto px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition flex items-center gap-1"
            >
              <Check size={14} />
              Marcar todas como leídas
            </button>
          )}

          {/* Results count */}
          <span className="ml-auto text-sm text-gray-500">
            {filteredResponses.length} respuestas
          </span>
        </div>
      </div>

      {/* Responses Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 w-10"></th>
              <th className="px-4 py-3 font-medium text-gray-500">Estado</th>
              <th className="px-6 py-3 font-medium text-gray-500">De / Asunto</th>
              <th className="px-6 py-3 font-medium text-gray-500">Cliente</th>
              <th className="px-6 py-3 font-medium text-gray-500">Clasificación</th>
              <th className="px-6 py-3 font-medium text-gray-500">Fecha</th>
              <th className="px-6 py-3 font-medium text-gray-500">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <span>Cargando respuestas...</span>
                  </div>
                </td>
              </tr>
            ) : filteredResponses.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  <div className="flex flex-col items-center gap-2">
                    <Inbox size={48} className="text-gray-300" />
                    <span className="font-medium">No hay respuestas</span>
                    <span className="text-sm">
                      {clientFilter || classificationFilter || readFilter || searchTerm
                        ? 'Intenta ajustar los filtros'
                        : 'Sincroniza para obtener nuevas respuestas'}
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredResponses.map((response) => (
                <React.Fragment key={response.id}>
                  <tr
                    key={response.id}
                    className={`hover:bg-gray-50 cursor-pointer ${!response.isRead ? 'bg-blue-50/30' : ''
                      }`}
                    onClick={() => toggleRowExpanded(response.id)}
                  >
                    <td className="px-4 py-4">
                      {expandedRows.has(response.id) ? (
                        <ChevronUp size={16} className="text-gray-400" />
                      ) : (
                        <ChevronDown size={16} className="text-gray-400" />
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {response.isRead ? (
                        <Mail size={18} className="text-gray-400" />
                      ) : (
                        <Mail size={18} className="text-blue-600 fill-blue-100" />
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div
                        className={`font-medium ${response.isRead ? 'text-gray-700' : 'text-gray-900'
                          }`}
                      >
                        {response.fromEmail}
                      </div>
                      <div className="text-sm text-gray-500 truncate max-w-xs">
                        {response.subject}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {response.emailSend?.client ? (
                        <div>
                          <div className="font-medium text-gray-700">
                            {response.emailSend.client.nombre}{' '}
                            {response.emailSend.client.apellido}
                          </div>
                          {response.emailSend.jobOffer && (
                            <div className="text-xs text-gray-500">
                              {response.emailSend.jobOffer.empresa}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <ClassificationBadge
                        classification={response.classification}
                        confidence={response.classificationConfidence || undefined}
                        showConfidence={true}
                        size="sm"
                      />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(response.receivedAt)}
                    </td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleViewThread(response)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Ver conversación"
                        >
                          <MessageSquare size={18} />
                        </button>
                        {response.isRead ? (
                          <button
                            onClick={() => handleMarkAsUnread(response.id)}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                            title="Marcar como no leído"
                          >
                            <EyeOff size={18} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleMarkAsRead(response.id)}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                            title="Marcar como leído"
                          >
                            <Eye size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => handleReclassify(response.id)}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition"
                          title="Reclasificar con IA"
                        >
                          <RotateCcw size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {/* Expanded Row */}
                  {expandedRows.has(response.id) && (
                    <tr key={`${response.id}-expanded`} className="bg-gray-50">
                      <td colSpan={7} className="px-6 py-4">
                        <div className="grid grid-cols-2 gap-6">
                          {/* Left: Response Preview */}
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">
                              Vista previa del contenido
                            </h4>
                            <div className="bg-white rounded-lg border p-4 text-sm text-gray-700 max-h-48 overflow-y-auto whitespace-pre-wrap">
                              {response.bodyText || 'Sin contenido de texto'}
                            </div>
                          </div>
                          {/* Right: Classification & Context */}
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-medium text-gray-900 mb-2">
                                Cambiar clasificación
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {classificationOptions.map((cls) => (
                                  <button
                                    key={cls}
                                    onClick={() =>
                                      handleUpdateClassification(response.id, cls)
                                    }
                                    className={`px-3 py-1.5 text-xs font-medium rounded-full border transition ${response.classification === cls
                                      ? 'bg-blue-600 text-white border-blue-600'
                                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                                      }`}
                                  >
                                    {cls === 'negativa' && 'Negativa'}
                                    {cls === 'automatica' && 'Automática'}
                                    {cls === 'entrevista' && 'Entrevista'}
                                    {cls === 'mas_informacion' && 'Más Info'}
                                    {cls === 'contratado' && 'Contratado'}
                                    {cls === 'sin_clasificar' && 'Sin Clasificar'}
                                  </button>
                                ))}
                              </div>
                            </div>
                            {response.classificationReasoning && (
                              <div>
                                <h4 className="font-medium text-gray-900 mb-2">
                                  Razón de clasificación (IA)
                                </h4>
                                <p className="text-sm text-gray-600 bg-white rounded-lg border p-3">
                                  {response.classificationReasoning}
                                </p>
                              </div>
                            )}
                            {response.emailSend?.jobOffer && (
                              <div>
                                <h4 className="font-medium text-gray-900 mb-2">
                                  Oferta relacionada
                                </h4>
                                <div className="text-sm bg-white rounded-lg border p-3">
                                  <div className="font-medium">
                                    {response.emailSend.jobOffer.titulo}
                                  </div>
                                  <div className="text-gray-600">
                                    {response.emailSend.jobOffer.empresa}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Thread Detail Modal */}
      {selectedResponse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-xl">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="text-blue-100 text-sm font-medium">Conversación</p>
                  <h2 className="text-xl font-bold text-white truncate">
                    {selectedResponse.subject}
                  </h2>
                  <div className="flex items-center gap-4 mt-2 text-blue-200 text-sm">
                    <span className="flex items-center gap-1">
                      <User size={14} />
                      {selectedResponse.fromEmail}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      {formatDate(selectedResponse.receivedAt)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedResponse(null);
                    setThreadData(null);
                  }}
                  className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-lg transition-all"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingThread ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <span className="ml-3 text-gray-600">Cargando conversación...</span>
                </div>
              ) : threadData ? (
                <div className="space-y-6">
                  {/* Original Email Sent */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Mail size={18} className="text-blue-600" />
                      Email Original Enviado
                    </h3>
                    <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium text-gray-900">
                            Para: {threadData.originalEmail.recipientEmail}
                          </div>
                          <div className="text-sm text-gray-600">
                            Asunto: {threadData.originalEmail.subjectSnapshot}
                          </div>
                        </div>
                        {threadData.originalEmail.sentAt && (
                          <span className="text-xs text-gray-500">
                            {formatDate(threadData.originalEmail.sentAt)}
                          </span>
                        )}
                      </div>
                      {threadData.originalEmail.client && (
                        <div className="mt-2 pt-2 border-t border-blue-200 text-sm">
                          <span className="text-gray-600">Cliente: </span>
                          <span className="font-medium">
                            {threadData.originalEmail.client.nombre}{' '}
                            {threadData.originalEmail.client.apellido}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Responses in Thread */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <MessageSquare size={18} className="text-green-600" />
                      Respuestas ({threadData.responses.length})
                    </h3>
                    <div className="space-y-4">
                      {threadData.responses.map((resp, index) => (
                        <div
                          key={resp.id}
                          className={`rounded-lg border p-4 ${resp.id === selectedResponse.id
                            ? 'bg-green-50 border-green-300'
                            : 'bg-white border-gray-200'
                            }`}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium">
                                {index + 1}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">
                                  {resp.fromEmail}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {formatDate(resp.receivedAt)}
                                </div>
                              </div>
                            </div>
                            <ClassificationBadge
                              classification={resp.classification}
                              confidence={resp.classificationConfidence || undefined}
                              showConfidence={true}
                              size="sm"
                            />
                          </div>
                          <div className="text-sm text-gray-600 font-medium mb-2">
                            {resp.subject}
                          </div>
                          <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded p-3 max-h-64 overflow-y-auto">
                            {resp.bodyText || 'Sin contenido de texto'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  No se pudo cargar la conversación
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Clasificación:</span>
                <ClassificationBadge
                  classification={selectedResponse.classification}
                  confidence={selectedResponse.classificationConfidence || undefined}
                  showConfidence={true}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleReclassify(selectedResponse.id)}
                  className="px-4 py-2 text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 font-medium transition flex items-center gap-2"
                >
                  <RotateCcw size={16} />
                  Reclasificar con IA
                </button>
                <button
                  onClick={() => {
                    setSelectedResponse(null);
                    setThreadData(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 font-medium transition"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
