import AppError from '../../../components/ui/AppError';

export default function PermissionGate({ message, onRetry }) {
  if (!message) return null;

  return (
    <AppError
      message={`${message} Abre Ajustes del sistema si ya negaste el permiso.`}
      onRetry={onRetry}
    />
  );
}
