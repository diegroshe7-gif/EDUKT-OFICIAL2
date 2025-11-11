import TutorForm from '../TutorForm';

export default function TutorFormExample() {
  return (
    <TutorForm
      onSubmit={(data) => console.log('Form submitted:', data)}
      onBack={() => console.log('Back clicked')}
    />
  );
}
