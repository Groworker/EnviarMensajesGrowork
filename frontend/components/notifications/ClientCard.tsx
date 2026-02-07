import { useState } from 'react';
import { ClientWorkflowCard } from '@/app/notifications/page';
import { ExternalLink, FolderOpen, Play } from 'lucide-react';
import ClientWorkflowModal from './ClientWorkflowModal';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface ClientCardProps {
  client: ClientWorkflowCard;
  requiresManualAction: boolean;
  onRefresh: () => void;
}

export default function ClientCard({
  client,
  requiresManualAction,
  onRefresh,
}: ClientCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  const getStatusColor = () => {
    switch (client.status) {
      case 'PENDING':
        return 'bg-orange-100 border-orange-300';
      case 'OK':
        return 'bg-green-100 border-green-300';
      case 'ERROR':
        return 'bg-red-100 border-red-300';
      default:
        return 'bg-gray-100 border-gray-300';
    }
  };

  const getStatusDot = () => {
    switch (client.status) {
      case 'PENDING':
        return 'bg-orange-500';
      case 'OK':
        return 'bg-green-500';
      case 'ERROR':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const handleOpenFolder = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (client.driveFolder) {
      window.open(
        `https://drive.google.com/drive/folders/${client.driveFolder}`,
        '_blank'
      );
    } else {
      toast.error('No hay carpeta de Drive configurada para este cliente');
    }
  };

  const handleExecuteWorkflow = async (e: React.MouseEvent) => {
    e.stopPropagation();
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
    <>
      <div
        onClick={() => setIsModalOpen(true)}
        className={`p-3 rounded-lg border-2 ${getStatusColor()} cursor-pointer hover:shadow-md transition-shadow`}
      >
        {/* Client Name and Status */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${getStatusDot()}`}></div>
            <h4 className="font-semibold text-gray-900 text-sm">
              {client.clientName || `Cliente ${client.clientId}`}
            </h4>
          </div>
        </div>

        {/* Estado */}
        <div className="text-xs text-gray-600 mb-2">
          Estado: <span className="font-medium">{client.estado}</span>
        </div>

        {/* Executed Date */}
        {client.executedAt && (
          <div className="text-xs text-gray-500 mb-2">
            Ejecutado:{' '}
            {new Date(client.executedAt).toLocaleDateString('es-ES', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        )}

        {/* Error Message Preview */}
        {client.errorMessage && (
          <div className="text-xs text-red-600 mb-2 line-clamp-2">
            {client.errorMessage}
          </div>
        )}

        {/* Action Buttons */}
        {requiresManualAction && client.status === 'OK' && client.nextWorkflow && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleOpenFolder}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
            >
              <FolderOpen size={14} />
              <span>Abrir Carpeta</span>
            </button>
            <button
              onClick={handleExecuteWorkflow}
              disabled={isExecuting}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <Play size={14} />
              <span>{isExecuting ? 'Ejecutando...' : `Ejecutar ${client.nextWorkflow}`}</span>
            </button>
          </div>
        )}

        {/* Execution URL Link */}
        {client.executionUrl && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              window.open(client.executionUrl!, '_blank');
            }}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-2"
          >
            <ExternalLink size={12} />
            <span>Ver en n8n</span>
          </button>
        )}
      </div>

      {/* Modal */}
      <ClientWorkflowModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        client={client}
        requiresManualAction={requiresManualAction}
        onRefresh={onRefresh}
      />
    </>
  );
}
