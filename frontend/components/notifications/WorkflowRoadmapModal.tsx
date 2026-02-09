'use client';

import { X, CheckCircle, Clock, XCircle, ExternalLink, FolderOpen, Play } from 'lucide-react';
import { useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import FilePickerModal from './FilePickerModal';

export interface WorkflowState {
    workflowType: string;
    status: string;
    executionUrl: string | null;
    executedAt: string | null;
    errorMessage: string | null;
    metadata: Record<string, any> | null;
}

export interface RoadmapModalProps {
    isOpen: boolean;
    onClose: () => void;
    clientId: number;
    clientName: string;
    estado: string;
    driveFolder: string | null;
    allWorkflows: WorkflowState[];
    onRefresh?: () => void;
    cvCreatorName?: string | null;
}

const WORKFLOW_TITLES: Record<string, { title: string; description: string; requiresManualAction: boolean }> = {
    'WKF-1': { title: 'WKF-1: Creación de Carpetas y CV', description: 'Auto-ejecutado desde Zoho CRM', requiresManualAction: false },
    'WKF-1.1': { title: 'WKF-1.1: Asignar Creador de CV', description: 'Requiere acción manual', requiresManualAction: true },
    'WKF-1.2': { title: 'WKF-1.2: Detectar Archivo Nuevo', description: 'Auto-ejecutado cada 5 horas', requiresManualAction: false },
    'WKF-1.3': { title: 'WKF-1.3: Mover CV a Definitiva', description: 'Requiere acción manual', requiresManualAction: true },
    'WKF-4': { title: 'WKF-4: Email Corporativo', description: 'Auto-ejecutado desde Zoho CRM', requiresManualAction: false },
};

export default function WorkflowRoadmapModal({
    isOpen,
    onClose,
    clientId,
    clientName,
    estado,
    driveFolder,
    allWorkflows,
    onRefresh,
    cvCreatorName,
}: RoadmapModalProps) {
    const [executingWorkflow, setExecutingWorkflow] = useState<string | null>(null);
    const [showFilePicker, setShowFilePicker] = useState(false);

    if (!isOpen) return null;

    const handleExecuteWorkflow = async (workflowType: string, metadata?: Record<string, any>) => {
        setExecutingWorkflow(workflowType);
        try {
            const response = await api.post(
                `/workflow-states/${clientId}/${workflowType}/execute`,
                metadata ? { metadata } : undefined
            );

            if (response.data.success) {
                toast.success(`Workflow ${workflowType} ejecutado correctamente`);
                if (onRefresh) onRefresh();
                onClose();
            } else {
                toast.error(response.data.error || 'Error al ejecutar el workflow');
            }
        } catch (error: any) {
            console.error('Error executing workflow:', error);
            toast.error('Error al ejecutar el workflow');
        } finally {
            setExecutingWorkflow(null);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'OK':
                return <CheckCircle className="text-green-500" size={24} />;
            case 'ERROR':
                return <XCircle className="text-red-500" size={24} />;
            default:
                return <Clock className="text-orange-500" size={24} />;
        }
    };

    const getStatusBadge = (status: string) => {
        const badges = {
            OK: 'bg-green-100 text-green-800',
            ERROR: 'bg-red-100 text-red-800',
            PENDING: 'bg-orange-100 text-orange-800',
        };
        return badges[status as keyof typeof badges] || badges.PENDING;
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return null;
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('es-ES', {
            dateStyle: 'medium',
            timeStyle: 'short',
        }).format(date);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">{clientName}</h2>
                        <span className={`inline-block mt-1 px-3 py-1 text-sm font-medium rounded-full ${estado === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                            estado === 'Onboarding' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                            }`}>
                            {estado}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white rounded-lg transition-colors"
                    >
                        <X size={24} className="text-gray-600" />
                    </button>
                </div>

                {/* Roadmap Timeline */}
                <div className="flex-1 overflow-y-auto px-6 py-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Progreso de Workflows</h3>

                    <div className="space-y-6">
                        {allWorkflows.map((workflow, index) => {
                            const info = WORKFLOW_TITLES[workflow.workflowType] || {
                                title: workflow.workflowType,
                                description: ''
                            };
                            const isLast = index === allWorkflows.length - 1;

                            return (
                                <div key={workflow.workflowType} className="relative">
                                    {/* Timeline Line */}
                                    {!isLast && (
                                        <div className="absolute left-3 top-10 bottom-0 w-0.5 bg-gray-200"
                                            style={{ height: 'calc(100% + 24px)' }} />
                                    )}

                                    {/* Workflow Item */}
                                    <div className="flex gap-4">
                                        {/* Icon */}
                                        <div className="relative z-10 flex-shrink-0">
                                            {getStatusIcon(workflow.status)}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 pb-8">
                                            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div>
                                                        <h4 className="font-semibold text-gray-900">{info.title}</h4>
                                                        <p className="text-sm text-gray-600">{info.description}</p>
                                                    </div>
                                                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusBadge(workflow.status)}`}>
                                                        {workflow.status}
                                                    </span>
                                                </div>

                                                {/* CV Creator for WKF-1.1 */}
                                                {workflow.workflowType === 'WKF-1.1' && cvCreatorName && (
                                                    <div className="mt-2">
                                                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700 border border-blue-300">
                                                            👤 Creador CV: {cvCreatorName}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Execution Details */}
                                                {workflow.executedAt && (
                                                    <div className="mt-3 text-sm text-gray-600">
                                                        <span className="font-medium">Ejecutado:</span> {formatDate(workflow.executedAt)}
                                                    </div>
                                                )}

                                                {/* Error Message */}
                                                {workflow.errorMessage && (
                                                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                                                        <p className="text-sm text-red-800">
                                                            <span className="font-semibold">Error:</span> {workflow.errorMessage}
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Metadata */}
                                                {workflow.metadata && Object.keys(workflow.metadata).length > 0 && (
                                                    <div className="mt-3">
                                                        <details className="text-sm">
                                                            <summary className="cursor-pointer text-gray-600 hover:text-gray-900 font-medium">
                                                                Ver detalles
                                                            </summary>
                                                            <div className="mt-2 p-3 bg-white rounded border border-gray-200">
                                                                <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                                                                    {JSON.stringify(workflow.metadata, null, 2)}
                                                                </pre>
                                                            </div>
                                                        </details>
                                                    </div>
                                                )}

                                                {/* Execution Link */}
                                                {workflow.executionUrl && (
                                                    <a
                                                        href={workflow.executionUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="mt-3 inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium"
                                                    >
                                                        <ExternalLink size={14} />
                                                        Ver en n8n
                                                    </a>
                                                )}

                                                {/* Execute Button for Manual Workflows */}
                                                {info.requiresManualAction && workflow.status === 'PENDING' && index > 0 && allWorkflows[index - 1].status === 'OK' && (
                                                    <button
                                                        onClick={() => {
                                                            if (workflow.workflowType === 'WKF-1.3') {
                                                                setShowFilePicker(true);
                                                            } else {
                                                                handleExecuteWorkflow(workflow.workflowType);
                                                            }
                                                        }}
                                                        disabled={executingWorkflow === workflow.workflowType}
                                                        className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        <Play size={16} />
                                                        {executingWorkflow === workflow.workflowType
                                                            ? 'Ejecutando...'
                                                            : workflow.workflowType === 'WKF-1.3'
                                                                ? 'Seleccionar CV y Ejecutar'
                                                                : `Ejecutar ${workflow.workflowType}`}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex gap-3">
                    {driveFolder && (
                        <a
                            href={`https://drive.google.com/drive/folders/${driveFolder}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                            <FolderOpen size={18} />
                            Abrir Carpeta Drive
                        </a>
                    )}
                    <button
                        onClick={onClose}
                        className="px-4 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                    >
                        Cerrar
                    </button>
                </div>
            </div>

            {/* File Picker Modal for WKF-1.3 */}
            {showFilePicker && (
                <FilePickerModal
                    clientId={clientId}
                    clientName={clientName}
                    onClose={() => setShowFilePicker(false)}
                    onSelect={async (fileId, fileName) => {
                        setShowFilePicker(false);
                        await handleExecuteWorkflow('WKF-1.3', { archivoId: fileId });
                        toast.success(`CV "${fileName}" seleccionado`);
                    }}
                />
            )}
        </div>
    );
}
