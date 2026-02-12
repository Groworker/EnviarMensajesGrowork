import { useState } from 'react';
import { ClientWorkflowCard } from '@/app/notifications/page';
import { ExternalLink, FolderOpen, ListOrdered, Play, AlertTriangle } from 'lucide-react';
import WorkflowRoadmapModal from './WorkflowRoadmapModal';
import FilePickerModal from './FilePickerModal';
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
  const [showFilePicker, setShowFilePicker] = useState(false);
  const isManualWorkflow = client.currentWorkflow === 'WKF-1.1' || client.currentWorkflow === 'WKF-1.3';
  const showManualActions = isManualWorkflow && (client.status === 'PENDING' || client.status === 'ERROR');

  const WORKFLOW_CARD_COLORS: Record<string, { bg: string; dot: string }> = {
    'WKF-1': { bg: 'bg-blue-50 border-blue-200', dot: 'bg-blue-500' },
    'WKF-1.1': { bg: 'bg-purple-50 border-purple-300', dot: 'bg-purple-500' },
    'WKF-1.2': { bg: 'bg-teal-50 border-teal-200', dot: 'bg-teal-500' },
    'WKF-1.3': { bg: 'bg-amber-50 border-amber-300', dot: 'bg-amber-500' },
    'WKF-1.4': { bg: 'bg-indigo-50 border-indigo-200', dot: 'bg-indigo-500' },
  };

  const getStatusColor = () => {
    switch (client.status) {
      case 'OK':
        return 'bg-green-100 border-green-300';
      case 'ERROR':
        return 'bg-red-100 border-red-300';
      case 'PENDING':
      default: {
        const wfColors = WORKFLOW_CARD_COLORS[client.currentWorkflow];
        return wfColors ? wfColors.bg : 'bg-gray-100 border-gray-300';
      }
    }
  };

  const getStatusDot = () => {
    switch (client.status) {
      case 'OK':
        return 'bg-green-500';
      case 'ERROR':
        return 'bg-red-500';
      case 'PENDING':
      default: {
        const wfColors = WORKFLOW_CARD_COLORS[client.currentWorkflow];
        return wfColors ? wfColors.dot : 'bg-gray-500';
      }
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



  return (
    <>
      <div
        onClick={() => setIsModalOpen(true)}
        className={`p-3 rounded-lg border-2 ${getStatusColor()} cursor-pointer hover:shadow-md transition-shadow`}
      >
        {/* Client Name + Status Badge */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusDot()}`}></div>
            <h4 className="font-semibold text-gray-900 text-sm truncate">
              {client.clientName || `Cliente ${client.clientId}`}
            </h4>
          </div>
          <span className={`flex-shrink-0 px-1.5 py-0.5 text-[10px] font-bold rounded ${
            client.status === 'ERROR'
              ? 'bg-red-100 text-red-700 border border-red-300'
              : client.status === 'OK'
                ? 'bg-green-100 text-green-700 border border-green-300'
                : 'bg-orange-100 text-orange-700 border border-orange-300'
          }`}>
            {client.status}
          </span>
        </div>

        {/* Estado */}
        <div className="text-xs text-gray-600 mb-2">
          Estado: <span className="font-medium">{client.estado}</span>
        </div>

        {/* CV Creator */}
        {client.cvCreatorName && (
          <div className="text-xs mb-2">
            <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 border border-blue-300">
              👤 Creador CV: {client.cvCreatorName}
            </span>
          </div>
        )}

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

        {/* Error Banner - prominent for current workflow error */}
        {client.status === 'ERROR' && (
          <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-300 rounded-md mb-2">
            <AlertTriangle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-red-700">
                Error en {client.currentWorkflow}
              </p>
              {client.errorMessage && (
                <p className="text-xs text-red-600 mt-0.5 line-clamp-2">
                  {client.errorMessage}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Show errors from other workflows (not the current one) */}
        {client.status !== 'ERROR' && client.allWorkflows?.some(
          (wf) => wf.status === 'ERROR' && wf.workflowType !== client.currentWorkflow
        ) && (
          <div className="flex items-start gap-2 p-2 bg-orange-50 border border-orange-300 rounded-md mb-2">
            <AlertTriangle size={14} className="text-orange-500 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              {client.allWorkflows.filter(
                (wf) => wf.status === 'ERROR' && wf.workflowType !== client.currentWorkflow
              ).map((wf) => (
                <p key={wf.workflowType} className="text-xs font-semibold text-orange-700">
                  Error previo en {wf.workflowType}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Buttons Section */}
        {showManualActions ? (
          // 3-button layout for manual workflows (pending and error)
          <div className="space-y-2">
            {/* Row 1: Ver Roadmap Completo */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsModalOpen(true);
              }}
              className="flex items-center justify-center gap-1 px-2 py-1.5 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700 transition-colors w-full"
            >
              <ListOrdered size={14} />
              <span>Ver Roadmap Completo</span>
            </button>

            {/* Row 2: Abrir Carpeta + Ejecutar Workflow */}
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const folderId = client.currentWorkflow === 'WKF-1.3' ? client.newFolderId : client.oldFolderId;
                  const folderName = client.currentWorkflow === 'WKF-1.3' ? 'NEW' : 'OLD';
                  if (folderId) {
                    window.open(`https://drive.google.com/drive/folders/${folderId}`, '_blank');
                  } else {
                    toast.error(`No hay carpeta ${folderName} configurada`);
                  }
                }}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
              >
                <FolderOpen size={14} />
                <span>{client.currentWorkflow === 'WKF-1.3' ? 'Carpeta NEW' : 'Carpeta OLD'}</span>
              </button>

              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (client.currentWorkflow === 'WKF-1.3') {
                    setShowFilePicker(true);
                    return;
                  }
                  if (!client.hasFilesInOldFolder) {
                    toast.error('Debes subir al menos 1 archivo a la carpeta OLD antes de ejecutar');
                    return;
                  }

                  setIsExecuting(true);
                  try {
                    const response = await api.post(
                      `/workflow-states/${client.clientId}/${client.currentWorkflow}/execute`
                    );

                    if (response.data.success) {
                      toast.success(`Workflow ${client.currentWorkflow} ejecutado correctamente`);
                      onRefresh();
                    } else {
                      toast.error(response.data.error || 'Error al ejecutar el workflow');
                    }
                  } catch (error: any) {
                    console.error('Error executing workflow:', error);
                    toast.error('Error al ejecutar el workflow');
                  } finally {
                    setIsExecuting(false);
                  }
                }}
                disabled={isExecuting}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play size={14} />
                <span>
                  {isExecuting
                    ? 'Ejecutando...'
                    : client.status === 'ERROR'
                      ? 'Intentar de nuevo'
                      : client.currentWorkflow === 'WKF-1.3'
                        ? 'Seleccionar CV'
                        : 'Ejecutar'}
                </span>
              </button>
            </div>

            {/* Warning if no files (only for WKF-1.1) */}
            {client.currentWorkflow === 'WKF-1.1' && !client.hasFilesInOldFolder && (
              <div className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                ⚠️ Sube el CV a la carpeta OLD primero
              </div>
            )}
          </div>
        ) : (
          // Single button for other workflows
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsModalOpen(true);
            }}
            className="flex items-center justify-center gap-1 px-2 py-1.5 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700 transition-colors w-full mt-3"
          >
            <ListOrdered size={14} />
            <span>Ver Roadmap Completo</span>
          </button>
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

      {/* Roadmap Modal */}
      <WorkflowRoadmapModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        clientId={client.clientId}
        clientName={client.clientName || `Cliente ${client.clientId}`}
        estado={client.estado}
        driveFolder={client.driveFolder}
        allWorkflows={client.allWorkflows}
        onRefresh={onRefresh}
        cvCreatorName={client.cvCreatorName}
      />

      {/* File Picker Modal for WKF-1.3 */}
      {showFilePicker && (
        <FilePickerModal
          clientId={client.clientId}
          clientName={client.clientName || `Cliente ${client.clientId}`}
          onClose={() => setShowFilePicker(false)}
          onSelect={async (fileId, fileName) => {
            setShowFilePicker(false);
            setIsExecuting(true);
            try {
              const response = await api.post(
                `/workflow-states/${client.clientId}/WKF-1.3/execute`,
                { metadata: { archivoId: fileId } }
              );
              if (response.data.success) {
                toast.success(`CV "${fileName}" enviado a carpeta DEFINITIVA`);
                onRefresh();
              } else {
                toast.error(response.data.error || 'Error al ejecutar WKF-1.3');
              }
            } catch (error: any) {
              console.error('Error executing WKF-1.3:', error);
              toast.error('Error al ejecutar WKF-1.3');
            } finally {
              setIsExecuting(false);
            }
          }}
        />
      )}
    </>
  );
}
