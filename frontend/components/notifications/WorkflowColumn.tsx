import { PipelineColumn } from '@/app/notifications/page';
import ClientCard from './ClientCard';

interface WorkflowColumnProps {
  column: PipelineColumn;
  onRefresh: () => void;
}

const WORKFLOW_COLORS: Record<string, { accent: string; headerBg: string }> = {
  'WKF-1': { accent: 'border-t-blue-500', headerBg: 'bg-blue-50' },
  'WKF-1.1': { accent: 'border-t-purple-500', headerBg: 'bg-purple-50' },
  'WKF-1.2': { accent: 'border-t-teal-500', headerBg: 'bg-teal-50' },
  'WKF-1.3': { accent: 'border-t-amber-500', headerBg: 'bg-amber-50' },
  'WKF-4': { accent: 'border-t-indigo-500', headerBg: 'bg-indigo-50' },
};

export default function WorkflowColumn({
  column,
  onRefresh,
}: WorkflowColumnProps) {
  const statusCounts = {
    PENDING: column.clients.filter((c) => c.status === 'PENDING').length,
    OK: column.clients.filter((c) => c.status === 'OK').length,
    ERROR: column.clients.filter((c) => c.status === 'ERROR').length,
  };

  const colors = WORKFLOW_COLORS[column.workflowType] || {
    accent: 'border-t-gray-400',
    headerBg: 'bg-gray-50',
  };

  return (
    <div
      className={`flex-shrink-0 w-80 bg-white rounded-lg shadow-sm border border-gray-200 border-t-4 ${colors.accent}`}
    >
      {/* Column Header */}
      <div className={`p-4 border-b border-gray-200 ${colors.headerBg}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-gray-900">{column.title}</h3>
            {column.requiresManualAction && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-purple-100 text-purple-600">
                Manual
              </span>
            )}
          </div>
          <span className="text-sm font-medium text-gray-500">
            {column.clients.length}
          </span>
        </div>
        <p className="text-sm text-gray-600 mb-3">{column.description}</p>

        {/* Status counts */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-orange-500"></div>
            <span className="text-gray-600">{statusCounts.PENDING}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-gray-600">{statusCounts.OK}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <span className="text-gray-600">{statusCounts.ERROR}</span>
          </div>
        </div>
      </div>

      {/* Client Cards */}
      <div className="p-3 space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto">
        {column.clients.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            No hay clientes en este workflow
          </div>
        ) : (
          column.clients.map((client) => (
            <ClientCard
              key={client.clientId}
              client={client}
              requiresManualAction={column.requiresManualAction}
              onRefresh={onRefresh}
            />
          ))
        )}
      </div>
    </div>
  );
}
