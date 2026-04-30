import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';
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
    { key: 'index', title: 'Dashboard', icon: 'grid' },
    { key: 'doctors', title: 'Users', icon: 'users' },
    { key: 'billing', title: 'Finance', icon: 'dollar-sign' },
    { key: 'pharmacy', title: 'Inventory', icon: 'package' },
    { key: 'departments', title: 'Depts', icon: 'layers' },
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
        <Text style={[styles.loadingTitle, { color: theme.primary }]}>Pulse</Text>
        <Text style={[styles.loadingSubtitle, { color: theme.textSecondary }]}>Admin Portal</Text>
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 16 }} />
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
              title: 'Doctor Profile',
              headerStyle: { backgroundColor: theme.surface },
              headerTintColor: theme.primary,
              headerTitleStyle: { fontWeight: '600', fontSize: 16 },
              headerShadowVisible: false,
              headerBackTitleVisible: false,
            }}
          />
          <Stack.Screen
            name="doctors/add"
            options={{
              headerShown: true,
              title: 'New Doctor',
              headerStyle: { backgroundColor: theme.surface },
              headerTintColor: theme.primary,
              headerTitleStyle: { fontWeight: '600', fontSize: 16 },
              headerShadowVisible: false,
              headerBackTitleVisible: false,
            }}
          />
          <Stack.Screen
            name="departments/[id]"
            options={{
              headerShown: true,
              title: 'Department Info',
              headerStyle: { backgroundColor: theme.surface },
              headerTintColor: theme.primary,
              headerTitleStyle: { fontWeight: '600', fontSize: 16 },
              headerShadowVisible: false,
              headerBackTitleVisible: false,
            }}
          />
          <Stack.Screen
            name="departments/add"
            options={{
              headerShown: true,
              title: 'New Department',
              headerStyle: { backgroundColor: theme.surface },
              headerTintColor: theme.primary,
              headerTitleStyle: { fontWeight: '600', fontSize: 16 },
              headerShadowVisible: false,
              headerBackTitleVisible: false,
            }}
          />
          <Stack.Screen
            name="wards/[id]"
            options={{
              headerShown: true,
              title: 'Ward Info',
              headerStyle: { backgroundColor: theme.surface },
              headerTintColor: theme.primary,
              headerTitleStyle: { fontWeight: '600', fontSize: 16 },
              headerShadowVisible: false,
              headerBackTitleVisible: false,
            }}
          />
          <Stack.Screen
            name="wards/add"
            options={{
              headerShown: true,
              title: 'New Ward',
              headerStyle: { backgroundColor: theme.surface },
              headerTintColor: theme.primary,
              headerTitleStyle: { fontWeight: '600', fontSize: 16 },
              headerShadowVisible: false,
              headerBackTitleVisible: false,
            }}
          />
          <Stack.Screen
            name="pharmacy/edit-medicine"
            options={{
              headerShown: true,
              title: 'Edit Medication',
              headerStyle: { backgroundColor: theme.surface },
              headerTintColor: theme.primary,
              headerTitleStyle: { fontWeight: '600', fontSize: 16 },
              headerShadowVisible: false,
              headerBackTitleVisible: false,
            }}
          />
          <Stack.Screen
            name="billing/create"
            options={{
              headerShown: true,
              title: 'New Invoice',
              headerStyle: { backgroundColor: theme.surface },
              headerTintColor: theme.primary,
              headerTitleStyle: { fontWeight: '600', fontSize: 16 },
              headerShadowVisible: false,
              headerBackTitleVisible: false,
            }}
          />
          <Stack.Screen
            name="pharmacy/add-medicine"
            options={{
              headerShown: true,
              title: 'New Medication',
              headerStyle: { backgroundColor: theme.surface },
              headerTintColor: theme.primary,
              headerTitleStyle: { fontWeight: '600', fontSize: 16 },
              headerShadowVisible: false,
              headerBackTitleVisible: false,
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
  loadingTitle: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 1,
  },
  loadingSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
    letterSpacing: 0.5,
  },
});
