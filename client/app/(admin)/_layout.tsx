import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { Redirect, Stack, useRouter, usePathname } from 'expo-router';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/shared/context/AuthContext';
import { getRoleHomeRoute } from '@/shared/constants/roleRoutes';
import { CustomTabBar, TabItem } from '@/components/ui/CustomTabBar';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { ROLES } from '@/shared/constants/roles';

const TAB_KEYS = ['index', 'doctors', 'billing', 'pharmacy', 'departments', 'wards', 'profile'] as const;

const TAB_PATH_MAP: Record<(typeof TAB_KEYS)[number], string> = {
  index: '/(admin)',
  doctors: '/(admin)/doctors',
  billing: '/(admin)/billing',
  pharmacy: '/(admin)/pharmacy',
  departments: '/(admin)/departments',
  wards: '/(admin)/wards',
  profile: '/(admin)/profile',
};

export default function AdminLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('index');

  const tabs: TabItem[] = [
    { key: 'index', title: 'System', icon: 'settings' },
    { key: 'doctors', title: 'Users', icon: 'users' },
    { key: 'billing', title: 'Finances', icon: 'dollar-sign' },
    { key: 'pharmacy', title: 'Inventory', icon: 'package' },
    { key: 'departments', title: 'Depts', icon: 'grid' },
    { key: 'wards', title: 'Wards', icon: 'home' },
    { key: 'profile', title: 'Profile', icon: 'user' },
  ];

  useEffect(() => {
    try {
      const segments = pathname.split('/');
      const screenName = segments[2];
      if (screenName && TAB_KEYS.includes(screenName as (typeof TAB_KEYS)[number])) {
        setActiveTab(screenName);
      }
    } catch (err) {
      console.error('[AdminLayout] Failed to parse pathname for tab state:', err);
    }
  }, [pathname]);

  const handleTabPress = (tabKey: string) => {
    setActiveTab(tabKey);
    const path = TAB_PATH_MAP[tabKey as (typeof TAB_KEYS)[number]] ?? `/(admin)/${tabKey}`;
    router.push(path);
  };

  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (user.role !== ROLES.ADMIN) {
    return <Redirect href={getRoleHomeRoute(user.role) ?? '/login'} />;
  }

  return (
    <ErrorBoundary>
      <View style={styles.container}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.background },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="doctors/index" options={{ headerShown: false }} />
          <Stack.Screen name="billing/index" options={{ headerShown: false }} />
          <Stack.Screen name="pharmacy/index" options={{ headerShown: false }} />
          <Stack.Screen name="departments/index" options={{ headerShown: false }} />
          <Stack.Screen name="wards/index" options={{ headerShown: false }} />
          <Stack.Screen name="profile" options={{ headerShown: false }} />

          <Stack.Screen
            name="doctors/[id]"
            options={{
              headerShown: true,
              title: 'User Details',
              headerStyle: { backgroundColor: theme.surface },
              headerTintColor: theme.text,
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="doctors/add"
            options={{
              headerShown: true,
              title: 'Add User',
              headerStyle: { backgroundColor: theme.surface },
              headerTintColor: theme.text,
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="departments/[id]"
            options={{
              headerShown: true,
              title: 'Department Details',
              headerStyle: { backgroundColor: theme.surface },
              headerTintColor: theme.text,
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="departments/add"
            options={{
              headerShown: true,
              title: 'Add Department',
              headerStyle: { backgroundColor: theme.surface },
              headerTintColor: theme.text,
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="wards/[id]"
            options={{
              headerShown: true,
              title: 'Ward Details',
              headerStyle: { backgroundColor: theme.surface },
              headerTintColor: theme.text,
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="wards/add"
            options={{
              headerShown: true,
              title: 'Add Ward',
              headerStyle: { backgroundColor: theme.surface },
              headerTintColor: theme.text,
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="pharmacy/edit-medicine"
            options={{
              headerShown: true,
              title: 'Edit Medicine',
              headerStyle: { backgroundColor: theme.surface },
              headerTintColor: theme.text,
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="billing/create"
            options={{
              headerShown: true,
              title: 'Create Bill',
              headerStyle: { backgroundColor: theme.surface },
              headerTintColor: theme.text,
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="pharmacy/add-medicine"
            options={{
              headerShown: true,
              title: 'Add Medicine',
              headerStyle: { backgroundColor: theme.surface },
              headerTintColor: theme.text,
              headerShadowVisible: false,
            }}
          />
        </Stack>

        <CustomTabBar activeTab={activeTab} onTabPress={handleTabPress} tabs={tabs} />
      </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
