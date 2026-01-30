'use client';

type Classification =
  | 'negativa'
  | 'automatica'
  | 'entrevista'
  | 'mas_informacion'
  | 'contratado'
  | 'sin_clasificar';

interface ClassificationBadgeProps {
  classification: Classification;
  confidence?: number;
  size?: 'sm' | 'md' | 'lg';
  showConfidence?: boolean;
}

const classificationConfig: Record<
  Classification,
  { label: string; bgColor: string; textColor: string; icon: string }
> = {
  negativa: {
    label: 'Negativa',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    icon: '✗',
  },
  automatica: {
    label: 'Automática',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-800',
    icon: '🤖',
  },
  entrevista: {
    label: 'Entrevista',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    icon: '📅',
  },
  mas_informacion: {
    label: 'Más Info',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
    icon: '📋',
  },
  contratado: {
    label: 'Contratado',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-800',
    icon: '🎉',
  },
  sin_clasificar: {
    label: 'Sin Clasificar',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-800',
    icon: '❓',
  },
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
};

export function ClassificationBadge({
  classification,
  confidence,
  size = 'md',
  showConfidence = false,
}: ClassificationBadgeProps) {
  const config = classificationConfig[classification] || classificationConfig.sin_clasificar;

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium rounded-full ${config.bgColor} ${config.textColor} ${sizeClasses[size]}`}
      title={
        showConfidence && confidence !== undefined
          ? `${config.label} (${Math.round(confidence * 100)}% confianza)`
          : config.label
      }
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
      {showConfidence && confidence !== undefined && (
        <span className="opacity-70 text-xs">
          ({Math.round(confidence * 100)}%)
        </span>
      )}
    </span>
  );
}

export function getClassificationColor(classification: Classification): string {
  return classificationConfig[classification]?.bgColor || 'bg-gray-100';
}

export function getClassificationLabel(classification: Classification): string {
  return classificationConfig[classification]?.label || 'Sin Clasificar';
}
