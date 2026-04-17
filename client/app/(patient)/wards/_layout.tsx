import { Stack } from 'expo-router';

export default function WardsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Wards', headerShown: false }} />
      <Stack.Screen name="[id]" options={{ title: 'Ward Details' }} />
    </Stack>
  );
}
