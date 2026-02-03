'use client';

import { X, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { useState } from 'react';

interface DeleteClientModalProps {
    client: any;
    eligibility: {
        canDelete: boolean;
        reasons: string[];
        warnings: string[];
        clientInfo: any;
    };
    onClose: () => void;
    onConfirm: (reason: string) => void;
    isDeleting: boolean;
}

export function DeleteClientModal({
    client,
    eligibility,
    onClose,
    onConfirm,
    isDeleting,
}: DeleteClientModalProps) {
    const [reason, setReason] = useState('');
    const [confirmChecked, setConfirmChecked] = useState(false);

    const handleConfirm = () => {
        if (!confirmChecked) return;
        onConfirm(reason);
    };

    const { clientInfo, canDelete, reasons, warnings } = eligibility;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-gray-200 bg-gradient-to-r from-red-600 to-red-700 rounded-t-xl">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-red-100 text-sm font-medium flex items-center gap-2">
                                <AlertTriangle size={18} />
                                Eliminar Cliente y Cuenta Google Workspace
                            </p>
                            <h2 className="text-2xl font-bold text-white mt-1">{clientInfo.nombre}</h2>
                            <p className="text-red-100 text-sm mt-1">{clientInfo.email}</p>
                        </div>
                        <button
                            onClick={onClose}
                            disabled={isDeleting}
                            className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-lg transition-all disabled:opacity-50"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Client Info Card */}
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-5 mb-6 border-2 border-gray-300">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-base">
                            <Info size={20} className="text-blue-600" />
                            Información del Cliente
                        </h3>
                        <div className="space-y-3">
                            {/* ID and CRM Status */}
                            <div className="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-200">
                                <div className="flex items-center gap-4">
                                    <div>
                                        <span className="text-xs text-gray-500 uppercase font-semibold">ID</span>
                                        <div className="text-lg font-bold text-gray-900">{clientInfo.id}</div>
                                    </div>
                                    <div className="h-10 w-px bg-gray-300"></div>
                                    <div>
                                        <span className="text-xs text-gray-500 uppercase font-semibold">Estado CRM</span>
                                        <div className="mt-1">
                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${clientInfo.estado === 'Cerrado'
                                                    ? 'bg-red-100 text-red-800'
                                                    : clientInfo.estado === 'Pausado'
                                                        ? 'bg-yellow-100 text-yellow-800'
                                                        : 'bg-green-100 text-green-800'
                                                }`}>
                                                {clientInfo.estado}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Email Operativo */}
                            <div className="bg-white rounded-lg p-3 border border-gray-200">
                                <span className="text-xs text-gray-500 uppercase font-semibold block mb-2">Email Operativo (Google Workspace)</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-mono font-medium text-gray-900 bg-gray-100 px-3 py-1.5 rounded border border-gray-300">
                                        {clientInfo.emailOperativo || 'No configurado'}
                                    </span>
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${clientInfo.googleAccountExists
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-red-100 text-red-800'
                                        }`}>
                                        {clientInfo.googleAccountExists ? '✓ Existe' : '✗ No existe'}
                                    </span>
                                </div>
                            </div>

                            {/* Ofertas Pendientes */}
                            <div className="bg-white rounded-lg p-3 border border-gray-200">
                                <span className="text-xs text-gray-500 uppercase font-semibold block mb-2">Ofertas Pendientes</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl font-bold text-orange-600">{clientInfo.matchingOffersCount}</span>
                                    <span className="text-sm text-gray-600">ofertas de trabajo que coinciden con sus preferencias</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Email Statistics */}
                    <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-200">
                        <h3 className="font-semibold text-blue-900 mb-3">Estadísticas de Emails</h3>
                        <div className="grid grid-cols-3 gap-3 text-sm">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-blue-600">
                                    {clientInfo.stats?.totalEmails || 0}
                                </div>
                                <div className="text-gray-600 text-xs">Total</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">
                                    {clientInfo.stats?.sent || 0}
                                </div>
                                <div className="text-gray-600 text-xs">Enviados</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-orange-600">
                                    {clientInfo.stats?.pendingReview || 0}
                                </div>
                                <div className="text-gray-600 text-xs">Pendientes</div>
                            </div>
                        </div>
                    </div>

                    {/* Deletion Eligibility */}
                    <div className={`rounded-lg p-4 mb-6 border ${canDelete
                        ? 'bg-green-50 border-green-300'
                        : 'bg-yellow-50 border-yellow-300'
                        }`}>
                        <h3 className={`font-semibold mb-3 flex items-center gap-2 ${canDelete ? 'text-green-900' : 'text-yellow-900'
                            }`}>
                            {canDelete ? (
                                <>
                                    <CheckCircle2 size={18} className="text-green-600" />
                                    Elegible para Eliminación Automática
                                </>
                            ) : (
                                <>
                                    <AlertTriangle size={18} className="text-yellow-600" />
                                    No Cumple Condic iones para Eliminación Automática
                                </>
                            )}
                        </h3>

                        {reasons.length > 0 && (
                            <div className="mb-3">
                                <p className="text-sm font-medium text-gray-700 mb-2">Razones:</p>
                                <ul className="list-disc list-inside space-y-1">
                                    {reasons.map((reason, idx) => (
                                        <li key={idx} className="text-sm text-gray-600">{reason}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {warnings.length > 0 && (
                            <div>
                                <p className="text-sm font-medium text-gray-700 mb-2">Advertencias:</p>
                                <ul className="list-disc list-inside space-y-1">
                                    {warnings.map((warning, idx) => (
                                        <li key={idx} className="text-sm text-gray-600">{warning}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Deletion Reason */}
                    <div className="mb-4 bg-gray-50 rounded-lg p-4 border-2 border-gray-300">
                        <label htmlFor="deletion-reason" className="block text-sm font-bold text-gray-800 mb-3">
                            📝 Razón de Eliminación (opcional)
                        </label>
                        <textarea
                            id="deletion-reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            disabled={isDeleting}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
                            rows={4}
                            placeholder="Ej: Cliente solicitó cancelación del servicio, cambio de proveedor, etc."
                        />
                        <p className="text-xs text-gray-600 mt-2">
                            Esta información se guardará en el historial para futuras consultas
                        </p>
                    </div>

                    {/* Confirmation Checkbox */}
                    <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                        <label className="flex items-start gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={confirmChecked}
                                onChange={(e) => setConfirmChecked(e.target.checked)}
                                disabled={isDeleting}
                                className="mt-1 rounded border-gray-300 text-red-600 focus:ring-red-500 disabled:cursor-not-allowed"
                            />
                            <div className="flex-1">
                                <span className="text-sm font-semibold text-red-900">
                                    Entiendo que esta acción no se puede deshacer
                                </span>
                                <p className="text-xs text-red-700 mt-1">
                                    El cliente será marcado como eliminado en la base de datos y su cuenta de Google
                                    Workspace será eliminada permanentemente. Los emails enviados se mantendrán para
                                    historial.
                                </p>
                            </div>
                        </label>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isDeleting}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!confirmChecked || isDeleting}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isDeleting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Eliminando...
                            </>
                        ) : (
                            <>
                                <AlertTriangle size={18} />
                                Eliminar Cliente
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
