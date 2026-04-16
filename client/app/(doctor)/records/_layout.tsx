import { Stack } from 'expo-router';

export default function RecordsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Medical Records', headerShown: false }} />
      <Stack.Screen name="add-record" options={{ title: 'Add Record' }} />
    </Stack>
  );
}
