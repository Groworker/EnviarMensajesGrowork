import { ClientWorkflowCard } from '@/app/notifications/page';
import { X, ExternalLink, FolderOpen, Play, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useState } from 'react';

interface ClientWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: ClientWorkflowCard;
  requiresManualAction: boolean;
  onRefresh: () => void;
}

export default function ClientWorkflowModal({
  isOpen,
  onClose,
  client,
  requiresManualAction,
  onRefresh,
}: ClientWorkflowModalProps) {
  const [isExecuting, setIsExecuting] = useState(false);

  if (!isOpen) return null;

  const getStatusIcon = () => {
    switch (client.status) {
      case 'PENDING':
        return <Clock className="text-orange-500" size={24} />;
      case 'OK':
        return <CheckCircle className="text-green-500" size={24} />;
      case 'ERROR':
        return <AlertCircle className="text-red-500" size={24} />;
    }
  };

  const getStatusText = () => {
    switch (client.status) {
      case 'PENDING':
        return 'Pendiente';
      case 'OK':
        return 'Completado';
      case 'ERROR':
        return 'Error';
    }
  };

  const getStatusColor = () => {
    switch (client.status) {
      case 'PENDING':
        return 'text-orange-700 bg-orange-100';
      case 'OK':
        return 'text-green-700 bg-green-100';
      case 'ERROR':
        return 'text-red-700 bg-red-100';
    }
  };

  const handleOpenFolder = () => {
    if (client.driveFolder) {
      window.open(
        `https://drive.google.com/drive/folders/${client.driveFolder}`,
        '_blank'
      );
    } else {
      toast.error('No hay carpeta de Drive configurada para este cliente');
    }
  };

  const handleExecuteWorkflow = async () => {
    if (!client.nextWorkflow) return;

    setIsExecuting(true);
    try {
      const response = await api.post(
        `/workflow-states/${client.clientId}/${client.nextWorkflow}/execute`
      );

      if (response.data.success) {
        toast.success(
          `Workflow ${client.nextWorkflow} ejecutado correctamente`
        );
        onRefresh();
        onClose();
      } else {
        toast.error(
          response.data.error || 'Error al ejecutar el workflow'
        );
      }
    } catch (error: any) {
      console.error('Error executing workflow:', error);
      toast.error('Error al ejecutar el workflow');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              {getStatusIcon()}
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {client.clientName || `Cliente ${client.clientId}`}
                </h2>
                <p className="text-sm text-gray-600">
                  Estado del cliente: {client.estado}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Status Badge */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado del Workflow
              </label>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor()}`}
              >
                {getStatusText()}
              </span>
            </div>

            {/* Execution URL */}
            {client.executionUrl && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL de Ejecución en n8n
                </label>
                <a
                  href={client.executionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800 underline"
                >
                  <ExternalLink size={16} />
                  <span>Ver ejecución en n8n</span>
                </a>
              </div>
            )}

            {/* Executed Date */}
            {client.executedAt && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de Ejecución
                </label>
                <p className="text-gray-900">
                  {new Date(client.executedAt).toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </p>
              </div>
            )}

            {/* Error Message */}
            {client.errorMessage && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mensaje de Error
                </label>
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 text-sm whitespace-pre-wrap">
                    {client.errorMessage}
                  </p>
                </div>
              </div>
            )}

            {/* Metadata */}
            {client.metadata && Object.keys(client.metadata).length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Metadata
                </label>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <pre className="text-sm text-gray-800 overflow-x-auto">
                    {JSON.stringify(client.metadata, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Drive Folder Link */}
            {client.driveFolder && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Carpeta de Google Drive
                </label>
                <button
                  onClick={handleOpenFolder}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800 underline"
                >
                  <FolderOpen size={16} />
                  <span>Abrir carpeta en Drive</span>
                </button>
              </div>
            )}

            {/* Next Workflow */}
            {client.nextWorkflow && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Siguiente Workflow
                </label>
                <p className="text-gray-900 font-medium">{client.nextWorkflow}</p>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          {requiresManualAction && client.status === 'OK' && client.nextWorkflow && (
            <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={handleOpenFolder}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FolderOpen size={18} />
                <span>Abrir Carpeta</span>
              </button>
              <button
                onClick={handleExecuteWorkflow}
                disabled={isExecuting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <Play size={18} />
                <span>
                  {isExecuting
                    ? 'Ejecutando...'
                    : `Ejecutar ${client.nextWorkflow}`}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
