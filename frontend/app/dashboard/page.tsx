import KPICards from '@/components/dashboard/KPICards';
import ClientPipeline from '@/components/dashboard/ClientPipeline';
import EmailStatsChart from '@/components/dashboard/EmailStatsChart';

export default function DashboardPage() {
    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Panel de Control</h1>
                    <p className="text-gray-500 mt-1">
                        Métricas y estadísticas en tiempo real
                    </p>
                </div>

                {/* KPI Cards */}
                <div className="mb-8">
                    <KPICards />
                </div>

                {/* Charts Grid - side by side */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {/* Email Stats - 3 columns */}
                    <div className="lg:col-span-3">
                        <EmailStatsChart />
                    </div>

                    {/* Pipeline - 2 columns */}
                    <div className="lg:col-span-2">
                        <ClientPipeline />
                    </div>
                </div>
            </div>
        </div>
    );
}
