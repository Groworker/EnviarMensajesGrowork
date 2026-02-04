'use client';

import KPICards from '@/components/dashboard/KPICards';
import ClientPipeline from '@/components/dashboard/ClientPipeline';
import EmailStatsChart from '@/components/dashboard/EmailStatsChart';
import WorkflowNotifications from '@/components/dashboard/WorkflowNotifications';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Panel de Control</h1>
            <p className="mt-1 text-sm text-gray-500">Sistema de Envío Automático de CVs</p>
          </div>
        </div>

        {/* KPIs Section */}
        <div className="mb-8">
          <KPICards />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Pipeline Chart - Takes up 1 column */}
          <div className="lg:col-span-1">
            <ClientPipeline />
          </div>
          {/* Email Stats Chart - Takes up 2 columns */}
          <div className="lg:col-span-2">
            <EmailStatsChart />
          </div>
        </div>

        {/* Notifications Section */}
        <div className="mb-8">
          <WorkflowNotifications />
        </div>
      </div>
    </div>
  );
}
