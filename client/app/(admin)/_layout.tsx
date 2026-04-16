import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { Redirect, Tabs } from 'expo-router';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { useAuth } from '@/shared/context/AuthContext';
import { getRoleHomeRoute } from '@/shared/constants/roleRoutes';

export default function AdminLayout() {
  const colorScheme = useColorScheme();
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (user.role !== 'admin') {
    return <Redirect href={getRoleHomeRoute(user.role) ?? '/login'} />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme].tint,
        headerShown: useClientOnlyValue(false, true),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'System',
          tabBarIcon: ({ color }) => <SymbolView name={{ ios: 'slider.horizontal.3', android: 'dashboard', web: 'dashboard' }} tintColor={color} size={28} />,
        }}
      />
      <Tabs.Screen
        name="doctors"
        options={{
          title: 'Users',
          tabBarIcon: ({ color }) => <SymbolView name={{ ios: 'person.3', android: 'groups', web: 'groups' }} tintColor={color} size={28} />,
        }}
      />
      <Tabs.Screen
        name="billing"
        options={{
          title: 'Finances',
          tabBarIcon: ({ color }) => <SymbolView name={{ ios: 'creditcard', android: 'payments', web: 'payments' }} tintColor={color} size={28} />,
        }}
      />
      <Tabs.Screen
        name="pharmacy"
        options={{
          title: 'Inventory',
          tabBarIcon: ({ color }) => <SymbolView name={{ ios: 'pills', android: 'medication', web: 'medication' }} tintColor={color} size={28} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <SymbolView name={{ ios: 'person.circle', android: 'person', web: 'person' }} tintColor={color} size={28} />,
        }}
      />
    </Tabs>
  );
}
