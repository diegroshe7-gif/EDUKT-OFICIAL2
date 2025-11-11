import StatusBadge from '../StatusBadge';

export default function StatusBadgeExample() {
  return (
    <div className="flex gap-3 p-6">
      <StatusBadge status="pendiente" />
      <StatusBadge status="aprobado" />
      <StatusBadge status="rechazado" />
    </div>
  );
}
