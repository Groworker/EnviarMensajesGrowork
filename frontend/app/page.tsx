'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { LayoutDashboard, Users, Mail, Activity, RefreshCw } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalClients: 0,
    activeClients: 0,
    jobsToday: 0,
    emailsSentToday: 0,
  });
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, jobsRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/jobs'),
      ]);
      setStats(statsRes.data);
      setJobs(jobsRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Panel de Control</h1>
          <p className="text-gray-500">Sistema de Envío Automático de CVs</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition"
        >
          <RefreshCw size={18} />
          Actualizar
        </button>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          title="Clientes Totales"
          value={stats.totalClients}
          icon={<Users className="text-blue-500" />}
          color="border-l-4 border-blue-500"
        />
        <StatCard
          title="Clientes Activos"
          value={stats.activeClients}
          icon={<Activity className="text-green-500" />}
          color="border-l-4 border-green-500"
        />
        <StatCard
          title="Jobs Hoy"
          value={stats.jobsToday}
          icon={<LayoutDashboard className="text-purple-500" />}
          color="border-l-4 border-purple-500"
        />
        <StatCard
          title="Emails Enviados Hoy"
          value={stats.emailsSentToday}
          icon={<Mail className="text-orange-500" />}
          color="border-l-4 border-orange-500"
        />
      </div>

      {/* Recent Jobs */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-800">Envíos Recientes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-6 py-3 font-medium">ID Job</th>
                <th className="px-6 py-3 font-medium">Cliente</th>
                <th className="px-6 py-3 font-medium">Fecha</th>
                <th className="px-6 py-3 font-medium">Estado</th>
                <th className="px-6 py-3 font-medium">Progreso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                    No hay trabajos recientes.
                  </td>
                </tr>
              ) : (
                jobs.map((job: any) => (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-mono text-xs">#{job.id}</td>
                    <td className="px-6 py-3 font-medium text-gray-900">
                      {job.client ? `${job.client.nombre} ${job.client.apellido || ''}` : `Client ${job.clientId}`}
                    </td>
                    <td className="px-6 py-3">
                      {new Date(job.scheduledDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
                                ${job.status === 'done' ? 'bg-green-100 text-green-800' :
                          job.status === 'running' ? 'bg-blue-100 text-blue-800' :
                            job.status === 'failed' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'}`}>
                        {job.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      {job.emailsSentCount} / {job.emailsToSend}
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

function StatCard({ title, value, icon, color }: any) {
  return (
    <div className={`rounded-xl bg-white p-6 shadow-sm ${color} flex items-center justify-between`}>
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
      </div>
      <div className="rounded-full bg-gray-50 p-3">
        {icon}
      </div>
    </div>
  );
}
