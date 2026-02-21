'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Trash2, AlertTriangle, XCircle, Mail, Globe, Users } from 'lucide-react';
import toast from 'react-hot-toast';

export interface CorporateEmail {
    id: number;
    nombre: string;
    apellido: string;
    emailOperativo: string;
    fechaCreacionEmailOperativo: string;
    estado: string;
    motivoCierre: string;
    emailDeletionPendingSince: string | null;
    emailDeletionReason: string | null;
    domain: string;
}

export interface Stats {
    total: number;
    active: number;
    pending: number;
    domains: Record<string, number>;
}

export default function CorporateEmailsPage() {
    const [emails, setEmails] = useState<CorporateEmail[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'active' | 'pending'>('all');

    const fetchData = async () => {
        try {
            setLoading(true);
            const [emailsRes, statsRes] = await Promise.all([
                api.get('/corporate-emails'),
                api.get('/corporate-emails/stats')
            ]);
            setEmails(emailsRes.data);
            setStats(statsRes.data);
        } catch (error) {
            console.error('Error fetching corporate emails:', error);
            toast.error('Error al cargar los correos corporativos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleDelete = async (email: string) => {
        if (!confirm(`¿Estás seguro de que deseas ELIMINAR el correo ${email} de Google Workspace? Esta acción es irreversible.`)) {
            return;
        }

        try {
            await api.delete(`/corporate-emails/${email}`);
            toast.success('Correo eliminado correctamente');
            fetchData();
        } catch (error) {
            console.error('Error deleting email:', error);
            toast.error('Error al eliminar el correo');
        }
    };

    const handleCancelDeletion = async (email: string) => {
        if (!confirm(`¿Deseas cancelar el borrado programado para ${email}?`)) {
            return;
        }

        try {
            await api.post(`/corporate-emails/${email}/cancel-deletion`);
            toast.success('Borrado cancelado correctamente');
            fetchData();
        } catch (error) {
            console.error('Error cancelling deletion:', error);
            toast.error('Error al cancelar el borrado');
        }
    };

    const filteredEmails = emails.filter(email => {
        if (filter === 'active') return !email.emailDeletionPendingSince;
        if (filter === 'pending') return !!email.emailDeletionPendingSince;
        return true;
    });

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Correos Corporativos</h1>
                    <p className="text-gray-600 mt-1">
                        Gestiona las cuentas de correo en Google Workspace y sus borrados automáticos
                    </p>
                </div>
            </div>

            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-lg shadow p-6 flex items-center">
                        <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
                            <Mail className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total Correos Activos</p>
                            <p className="text-2xl font-semibold text-gray-900">{stats.active}</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6 flex items-center">
                        <div className="p-3 rounded-full bg-red-100 text-red-600 mr-4">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Pendientes de Borrado</p>
                            <p className="text-2xl font-semibold text-gray-900">{stats.pending}</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6 flex flex-col justify-center">
                        <div className="flex items-center mb-2">
                            <Globe className="w-4 h-4 text-gray-500 mr-2" />
                            <p className="text-sm font-medium text-gray-500">Uso por Dominio</p>
                        </div>
                        <div className="space-y-1">
                            {Object.entries(stats.domains).map(([domain, count]) => (
                                <div key={domain} className="flex justify-between text-sm">
                                    <span className="text-gray-600">{domain}</span>
                                    <span className="font-semibold">{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gray-50 flex gap-4">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border hover:bg-gray-50'}`}
                    >
                        Todos
                    </button>
                    <button
                        onClick={() => setFilter('active')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filter === 'active' ? 'bg-green-600 text-white' : 'bg-white text-gray-700 border hover:bg-gray-50'}`}
                    >
                        Activos
                    </button>
                    <button
                        onClick={() => setFilter('pending')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filter === 'pending' ? 'bg-red-600 text-white' : 'bg-white text-gray-700 border hover:bg-gray-50'}`}
                    >
                        En Periodo de Gracia
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado / Gracia</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Creación</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredEmails.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        No hay correos que coincidan con los filtros.
                                    </td>
                                </tr>
                            ) : (
                                filteredEmails.map((email) => (
                                    <tr key={email.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{email.emailOperativo}</div>
                                            <div className="text-xs text-gray-500">{email.domain}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{email.nombre} {email.apellido}</div>
                                            <div className="text-xs text-gray-500">CRM: {email.estado} {email.motivoCierre ? `(${email.motivoCierre})` : ''}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {email.emailDeletionPendingSince ? (
                                                <div className="flex flex-col gap-1">
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 w-max">
                                                        <AlertTriangle className="w-3 h-3" />
                                                        Borrado Pendiente
                                                    </span>
                                                    <span className="text-xs text-gray-500 max-w-xs truncate" title={email.emailDeletionReason || ''}>
                                                        Motivo: {email.emailDeletionReason}
                                                    </span>
                                                    <span className="text-xs text-red-600 font-medium">
                                                        Desde: {new Date(email.emailDeletionPendingSince).toLocaleString('es-ES')}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    Activo
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {email.fechaCreacionEmailOperativo ? new Date(email.fechaCreacionEmailOperativo).toLocaleDateString('es-ES') : 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-3">
                                                {email.emailDeletionPendingSince && (
                                                    <button
                                                        onClick={() => handleCancelDeletion(email.emailOperativo)}
                                                        className="text-gray-500 hover:text-green-600 transition-colors flex items-center gap-1"
                                                        title="Cancelar borrado programado"
                                                    >
                                                        <XCircle className="w-4 h-4" />
                                                        <span className="hidden sm:inline">Cancelar</span>
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDelete(email.emailOperativo)}
                                                    className="text-red-600 hover:text-red-900 transition-colors flex items-center gap-1"
                                                    title="Borrar inmediatamente de Google Workspace"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    <span className="hidden sm:inline">Borrar</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
