import { Stack } from 'expo-router';

export default function DoctorsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Doctors', headerShown: false }} />
      <Stack.Screen name="[id]" options={{ title: 'Doctor Details' }} />
      <Stack.Screen name="add" options={{ title: 'Add Doctor' }} />
    </Stack>
  );
}
