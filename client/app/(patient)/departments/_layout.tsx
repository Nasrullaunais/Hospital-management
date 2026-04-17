import { Stack } from 'expo-router';

export default function DepartmentsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Departments', headerShown: false }} />
      <Stack.Screen name="[id]" options={{ title: 'Department Details' }} />
    </Stack>
  );
}
