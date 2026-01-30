'use client';

import { useState, useEffect } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { ConfirmDialog } from '../../components/ConfirmDialog';

interface EmailPreview {
  id: number;
  recipientEmail: string;
  status: string;
  subjectSnapshot: string;
  content_snapshot: string;
  aiGenerated: boolean;
  aiModel: string | null;
  attachmentsCount: number;
  sentAt: string;
  reviewedAt: string | null;
  client: {
    id: number;
    nombre: string;
    apellido: string;
    email: string;
  };
  jobOffer: {
    id: number;
    puesto: string;
    empresa: string;
    ciudad: string;
    pais: string;
  };
}

interface Stats {
  pending: number;
  approvedToday: number;
  rejectedToday: number;
}

export default function PreviewEmailsPage() {
  const [pendingEmails, setPendingEmails] = useState<EmailPreview[]>([]);
  const [approvedEmails, setApprovedEmails] = useState<EmailPreview[]>([]);
  const [stats, setStats] = useState<Stats>({ pending: 0, approvedToday: 0, rejectedToday: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<EmailPreview | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedSubject, setEditedSubject] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [processing, setProcessing] = useState(false);

  // Tab filter state
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    variant: 'danger' | 'warning' | 'info';
  }>({
    open: false,
    title: '',
    description: '',
    onConfirm: () => { },
    variant: 'info',
  });

  const fetchEmails = async () => {
    try {
      const [pendingRes, approvedRes, statsRes] = await Promise.all([
        api.get('/email-preview'),
        api.get('/email-preview/approved-today'),
        api.get('/email-preview/stats'),
      ]);
      setPendingEmails(pendingRes.data);
      setApprovedEmails(approvedRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error fetching emails:', error);
      toast.error('Error al cargar los emails');
    } finally {
      setLoading(false);
    }
  };

  // Get the current displayed emails based on active tab
  const emails = activeTab === 'pending' ? pendingEmails : approvedEmails;

  useEffect(() => {
    fetchEmails();
  }, []);

  const openPreview = (email: EmailPreview) => {
    setSelectedEmail(email);
    setEditedSubject(email.subjectSnapshot || '');
    setEditedContent(email.content_snapshot || '');
    setEditMode(false);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedEmail(null);
    setEditMode(false);
  };

  const handleApprove = async () => {
    if (!selectedEmail) return;
    setProcessing(true);
    const loadingToast = toast.loading('Enviando email...');

    try {
      await api.post(`/email-preview/${selectedEmail.id}/approve`);
      toast.success('Email enviado correctamente', { id: loadingToast });
      closeModal();
      fetchEmails();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al enviar', { id: loadingToast });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedEmail) return;
    setProcessing(true);
    const loadingToast = toast.loading('Rechazando email...');

    try {
      await api.post(`/email-preview/${selectedEmail.id}/reject`);
      toast.success('Email rechazado', { id: loadingToast });
      closeModal();
      fetchEmails();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al rechazar', { id: loadingToast });
    } finally {
      setProcessing(false);
    }
  };

  const handleRegenerate = async () => {
    if (!selectedEmail) return;
    setProcessing(true);
    const loadingToast = toast.loading('Regenerando con IA...');

    try {
      const response = await api.post(`/email-preview/${selectedEmail.id}/regenerate`);
      setSelectedEmail(response.data);
      setEditedSubject(response.data.subjectSnapshot || '');
      setEditedContent(response.data.content_snapshot || '');
      toast.success('Email regenerado', { id: loadingToast });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al regenerar', { id: loadingToast });
    } finally {
      setProcessing(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedEmail) return;
    setProcessing(true);
    const loadingToast = toast.loading('Guardando cambios...');

    try {
      const response = await api.patch(`/email-preview/${selectedEmail.id}`, {
        subject: editedSubject,
        content: editedContent,
      });
      setSelectedEmail(response.data);
      setEditMode(false);
      toast.success('Cambios guardados', { id: loadingToast });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al guardar', { id: loadingToast });
    } finally {
      setProcessing(false);
    }
  };

  const executeDelete = async (emailId: number) => {
    const loadingToast = toast.loading('Eliminando email...');
    try {
      await api.delete(`/email-preview/${emailId}`);
      toast.success('Email eliminado', { id: loadingToast });
      if (selectedEmail?.id === emailId) {
        closeModal();
      }
      fetchEmails();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al eliminar', { id: loadingToast });
    }
  };

  const handleDelete = (emailId: number) => {
    setConfirmDialog({
      open: true,
      title: 'Eliminar email',
      description: '¿Estás seguro de que quieres eliminar este email? Esta acción no se puede deshacer.',
      onConfirm: () => executeDelete(emailId),
      variant: 'danger',
    });
  };

  const executeDeleteAll = async () => {
    const loadingToast = toast.loading('Eliminando todos los emails...');
    try {
      const response = await api.delete('/email-preview');
      toast.success(`${response.data.deleted} emails eliminados`, { id: loadingToast });
      fetchEmails();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al eliminar', { id: loadingToast });
    }
  };

  const handleDeleteAll = () => {
    setConfirmDialog({
      open: true,
      title: 'Eliminar todos los emails',
      description: `¿Estás seguro de que quieres eliminar los ${pendingEmails.length} emails pendientes? Esta acción no se puede deshacer.`,
      onConfirm: executeDeleteAll,
      variant: 'danger',
    });
  };

  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Preview de Emails</h1>
            <p className="mt-2 text-gray-600">
              Revisa y aprueba los emails antes de enviarlos
            </p>
          </div>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Preview de Emails</h1>
          <p className="mt-2 text-gray-600">
            Revisa y aprueba los emails antes de enviarlos
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="rounded-md bg-yellow-100 p-3">
                    <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Pendientes</dt>
                    <dd className="text-2xl font-semibold text-gray-900">{stats.pending}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="rounded-md bg-green-100 p-3">
                    <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Aprobados hoy</dt>
                    <dd className="text-2xl font-semibold text-gray-900">{stats.approvedToday}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="rounded-md bg-red-100 p-3">
                    <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Rechazados hoy</dt>
                    <dd className="text-2xl font-semibold text-gray-900">{stats.rejectedToday}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex gap-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('pending')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'pending'
                    ? 'border-yellow-500 text-yellow-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Pendientes de Revisión
                  {stats.pending > 0 && (
                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      {stats.pending}
                    </span>
                  )}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('approved')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'approved'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Aprobados Hoy
                  {stats.approvedToday > 0 && (
                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {stats.approvedToday}
                    </span>
                  )}
                </span>
              </button>
            </nav>
          </div>
        </div>

        {/* Emails Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">
              {activeTab === 'pending' ? 'Emails Pendientes de Revisión' : 'Emails Aprobados Hoy'}
            </h2>
            {activeTab === 'pending' && pendingEmails.length > 0 && (
              <button
                onClick={handleDeleteAll}
                className="px-3 py-1.5 bg-red-100 text-red-700 text-sm font-medium rounded-md hover:bg-red-200 transition-colors"
              >
                Eliminar todos ({pendingEmails.length})
              </button>
            )}
          </div>

          {emails.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {activeTab === 'pending' ? 'No hay emails pendientes' : 'No hay emails aprobados hoy'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {activeTab === 'pending'
                  ? 'Los emails generados aparecerán aquí para su revisión.'
                  : 'Los emails que apruebes aparecerán en esta lista.'}
              </p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Destinatario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Oferta
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IA
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Adjuntos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {activeTab === 'pending' ? 'Acciones' : 'Enviado'}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {emails.map((email) => (
                  <tr key={email.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {email.client.nombre} {email.client.apellido}
                      </div>
                      <div className="text-sm text-gray-500">{email.client.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{email.recipientEmail}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{email.jobOffer.puesto}</div>
                      <div className="text-sm text-gray-500">
                        {email.jobOffer.empresa} - {email.jobOffer.ciudad}, {email.jobOffer.pais}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {email.aiGenerated ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {email.aiModel || 'IA'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Template
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {email.attachmentsCount} PDF{email.attachmentsCount !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {activeTab === 'pending' ? (
                        <div className="flex gap-3">
                          <button
                            onClick={() => openPreview(email)}
                            className="text-blue-600 hover:text-blue-900 font-medium"
                          >
                            Ver Preview
                          </button>
                          <button
                            onClick={() => handleDelete(email.id)}
                            className="text-red-600 hover:text-red-900 font-medium"
                          >
                            Eliminar
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-gray-600">
                            {email.reviewedAt
                              ? new Date(email.reviewedAt).toLocaleTimeString('es-ES', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                              : '-'}
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Confirm Dialog */}
        <ConfirmDialog
          open={confirmDialog.open}
          onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
          title={confirmDialog.title}
          description={confirmDialog.description}
          onConfirm={confirmDialog.onConfirm}
          variant={confirmDialog.variant}
          confirmText="Confirmar"
          cancelText="Cancelar"
        />

        {/* Preview Modal */}
        {showModal && selectedEmail && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeModal}></div>

              <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl">
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">
                      Preview del Email
                    </h3>
                    <button onClick={closeModal} className="text-white hover:text-gray-200">
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Modal Content */}
                <div className="max-h-[60vh] overflow-y-auto p-6">
                  {/* Email Info */}
                  <div className="mb-6 grid grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4">
                    <div>
                      <p className="text-sm text-gray-500">De:</p>
                      <p className="text-sm font-medium text-gray-900">
                        {selectedEmail.client.nombre} {selectedEmail.client.apellido} ({selectedEmail.client.email})
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Para:</p>
                      <p className="text-sm font-medium text-gray-900">{selectedEmail.recipientEmail}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Oferta:</p>
                      <p className="text-sm font-medium text-gray-900">
                        {selectedEmail.jobOffer.puesto} - {selectedEmail.jobOffer.empresa}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Adjuntos:</p>
                      <p className="text-sm font-medium text-gray-900">
                        {selectedEmail.attachmentsCount} archivo(s) PDF
                      </p>
                    </div>
                  </div>

                  {/* Subject */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Asunto:</label>
                    {editMode ? (
                      <input
                        type="text"
                        value={editedSubject}
                        onChange={(e) => setEditedSubject(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    ) : (
                      <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
                        {selectedEmail.subjectSnapshot || 'Sin asunto'}
                      </p>
                    )}
                  </div>

                  {/* Content */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contenido:</label>
                    {editMode ? (
                      <textarea
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        rows={12}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                      />
                    ) : (
                      <div
                        className="bg-gray-50 rounded-md p-4 border border-gray-200"
                        dangerouslySetInnerHTML={{ __html: selectedEmail.content_snapshot || '' }}
                      />
                    )}
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="bg-gray-50 px-6 py-4 flex justify-between items-center">
                  <div className="flex gap-2">
                    {editMode ? (
                      <>
                        <button
                          onClick={handleSaveEdit}
                          disabled={processing}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                          Guardar Cambios
                        </button>
                        <button
                          onClick={() => setEditMode(false)}
                          disabled={processing}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setEditMode(true)}
                          disabled={processing}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
                        >
                          Editar
                        </button>
                        <button
                          onClick={handleRegenerate}
                          disabled={processing}
                          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                        >
                          Regenerar IA
                        </button>
                      </>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDelete(selectedEmail.id)}
                      disabled={processing || editMode}
                      className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
                    >
                      Eliminar
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={processing || editMode}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                    >
                      Rechazar
                    </button>
                    <button
                      onClick={handleApprove}
                      disabled={processing || editMode}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                      Aprobar y Enviar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
