import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/shared/context/AuthContext';
import { getRoleHomeRoute } from '@/shared/constants/roleRoutes';

export default function AppIndexRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator testID="app-index-loading" size="large" color="#2563eb" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  switch (user.role) {
    case 'patient':
      return <Redirect href="/(patient)" />;
    case 'doctor':
      return <Redirect href="/(doctor)" />;
    case 'pharmacist':
      return <Redirect href="/(pharmacist)" />;
    case 'admin':
      return <Redirect href="/(admin)" />;
    default:
      return <Redirect href={getRoleHomeRoute(user.role) ?? '/login'} />;
  }
}
