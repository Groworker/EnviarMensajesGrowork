import KPICards from '@/components/dashboard/KPICards';
import ClientPipeline from '@/components/dashboard/ClientPipeline';
import EmailStatsChart from '@/components/dashboard/EmailStatsChart';
import WorkflowNotifications from '@/components/dashboard/WorkflowNotifications';

export default function DashboardPage() {
    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Dashboard Profesional</h1>
                    <p className="text-gray-600 mt-2">
                        Panel de control con estadísticas en tiempo real y notificaciones de workflows
                    </p>
                </div>

                {/* KPI Cards */}
                <div className="mb-8">
                    <KPICards />
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    {/* Notifications - takes 2 columns (Most Important) */}
                    <div className="lg:col-span-2">
                        <WorkflowNotifications />
                    </div>

                    {/* Pipeline - takes 1 column */}
                    <div className="lg:col-span-1">
                        <ClientPipeline />
                    </div>
                </div>

                {/* Email Stats - full width */}
                <div className="mb-6">
                    <EmailStatsChart />
                </div>
            </div>
        </div>
    );
}
