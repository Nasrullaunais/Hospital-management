import React from 'react';
import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/shared/context/AuthContext';
import { getRoleHomeRoute } from '@/shared/constants/roleRoutes';

export default function PharmacyLayout() {
  const { user } = useAuth();

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (user.role !== 'admin') {
    return <Redirect href={getRoleHomeRoute(user.role) ?? '/login'} />;
  }

  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Pharmacy Inventory' }} />
      <Stack.Screen name="add-medicine" options={{ title: 'Add Medication' }} />
    </Stack>
  );
}
