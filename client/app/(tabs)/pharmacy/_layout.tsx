import React from 'react';
import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/shared/context/AuthContext';

export default function PharmacyLayout() {
  const { user } = useAuth();
  const isStaff = user?.role === 'admin' || user?.role === 'doctor' || user?.role === 'pharmacist';

  if (!isStaff) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Pharmacy Inventory' }} />
      <Stack.Screen name="add-medicine" options={{ title: 'Add Medication' }} />
    </Stack>
  );
}
