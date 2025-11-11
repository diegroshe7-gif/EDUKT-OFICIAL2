import { useState } from 'react';
import AdminPanel from '../AdminPanel';

export default function AdminPanelExample() {
  const [pending, setPending] = useState<any[]>([
    {
      nombre: 'Pedro Sánchez',
      edad: 28,
      email: 'pedro@example.com',
      telefono: '+52 33 5555 1234',
      materias: 'Historia, Geografía',
      modalidad: 'online',
      tarifa: 350,
      disponibilidad: 'Lun-Vie 17:00-20:00',
      bio: 'Historiador con pasión por la enseñanza.',
      cvUrl: 'https://example.com/cv-pedro.pdf',
      status: 'pendiente',
    },
  ]);

  const [approved, setApproved] = useState<any[]>([
    {
      nombre: 'María López',
      edad: 27,
      email: 'maria@example.com',
      telefono: '+52 33 1234 5678',
      materias: 'Matemáticas, Física',
      modalidad: 'mixta',
      ubicacion: 'Guadalajara',
      tarifa: 400,
      disponibilidad: 'Lun-Mie 16:00-20:00',
      bio: 'Ingeniera con 5 años de experiencia.',
      status: 'aprobado',
    },
  ]);

  const [rejected, setRejected] = useState<any[]>([]);

  const handleApprove = (idx: number) => {
    setPending((p) => {
      const tutor = p[idx];
      const rest = p.filter((_, i) => i !== idx);
      setApproved((a) => [...a, { ...tutor, status: 'aprobado' }]);
      return rest;
    });
  };

  const handleReject = (idx: number) => {
    setPending((p) => {
      const tutor = p[idx];
      const rest = p.filter((_, i) => i !== idx);
      setRejected((r) => [...r, { ...tutor, status: 'rechazado' }]);
      return rest;
    });
  };

  return (
    <AdminPanel
      pending={pending}
      approved={approved}
      rejected={rejected}
      onApprove={handleApprove}
      onReject={handleReject}
      onBack={() => console.log('Back clicked')}
    />
  );
}
