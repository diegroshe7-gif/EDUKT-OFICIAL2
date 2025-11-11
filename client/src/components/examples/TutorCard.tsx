import TutorCard from '../TutorCard';
import avatarFemale from '@assets/generated_images/Female_tutor_profile_photo_2eb1fc5f.png';

export default function TutorCardExample() {
  const mockTutor = {
    id: '1',
    nombre: 'María López',
    edad: 27,
    email: 'maria@example.com',
    telefono: '+52 33 1234 5678',
    materias: 'Matemáticas, Física, Química',
    modalidad: 'mixta',
    ubicacion: 'Guadalajara, Jalisco',
    tarifa: 400,
    disponibilidad: 'Lun-Mie 16:00-20:00',
    bio: 'Ingeniera con 5 años de experiencia enseñando matemáticas y ciencias a estudiantes de preparatoria y universidad.',
    avatarUrl: avatarFemale,
  };

  return (
    <div className="p-6 max-w-md">
      <TutorCard 
        tutor={mockTutor}
        onSchedule={(t) => console.log('Schedule clicked:', t.nombre)}
        onViewProfile={(t) => console.log('View profile clicked:', t.nombre)}
      />
    </div>
  );
}
