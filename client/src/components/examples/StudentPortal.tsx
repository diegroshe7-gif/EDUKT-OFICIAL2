import StudentPortal from '../StudentPortal';
import avatarFemale from '@assets/generated_images/Female_tutor_profile_photo_2eb1fc5f.png';
import avatarMale from '@assets/generated_images/Male_tutor_profile_photo_0ee3a629.png';
import avatarFemale2 from '@assets/generated_images/Female_tutor_profile_photo_2_5bd4c3a5.png';

export default function StudentPortalExample() {
  const mockTutors = [
    {
      id: '1',
      nombre: 'María López',
      edad: 27,
      email: 'maria@example.com',
      telefono: '+52 33 1234 5678',
      materias: 'Matemáticas, Física',
      modalidad: 'mixta',
      ubicacion: 'Guadalajara',
      tarifa: 400,
      disponibilidad: 'Lun-Mie 16:00-20:00',
      bio: 'Ingeniera con 5 años de experiencia enseñando matemáticas y física.',
      avatarUrl: avatarFemale,
    },
    {
      id: '2',
      nombre: 'Carlos Chen',
      edad: 32,
      email: 'carlos@example.com',
      telefono: '+52 55 9876 5432',
      materias: 'Programación, Inglés',
      modalidad: 'online',
      tarifa: 500,
      disponibilidad: 'Mar-Jue 18:00-21:00',
      bio: 'Desarrollador senior y profesor de inglés certificado.',
      avatarUrl: avatarMale,
    },
    {
      id: '3',
      nombre: 'Ana Williams',
      edad: 29,
      email: 'ana@example.com',
      telefono: '+52 81 3456 7890',
      materias: 'Química, Biología',
      modalidad: 'presencial',
      ubicacion: 'Monterrey',
      tarifa: 450,
      disponibilidad: 'Lun-Vie 15:00-19:00',
      bio: 'Química con maestría, especializada en preparación para exámenes.',
      avatarUrl: avatarFemale2,
    },
  ];

  return (
    <StudentPortal
      tutors={mockTutors}
      onBack={() => console.log('Back clicked')}
      onCheckout={(params) => console.log('Checkout:', params)}
    />
  );
}
