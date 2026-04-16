import { Stack } from 'expo-router';

export default function DoctorAppointmentsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'My Schedule', headerShown: false }} />
    </Stack>
  );
}
