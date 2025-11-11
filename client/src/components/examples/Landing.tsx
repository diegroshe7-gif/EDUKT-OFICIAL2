import Landing from '../Landing';

export default function LandingExample() {
  return (
    <Landing onSelectRole={(role) => console.log('Selected role:', role)} />
  );
}
