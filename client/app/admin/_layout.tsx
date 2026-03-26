import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack>
      <Stack.Screen name="add-doctor" options={{ title: 'Add Doctor' }} />
    </Stack>
  );
}
