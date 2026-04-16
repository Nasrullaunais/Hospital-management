import { Stack } from 'expo-router';

export default function AppointmentsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'My Appointments', headerShown: false }} />
      <Stack.Screen name="book" options={{ title: 'Book Appointment' }} />
    </Stack>
  );
}
