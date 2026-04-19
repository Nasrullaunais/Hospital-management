import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { Redirect, Stack, useRouter, usePathname } from 'expo-router';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/shared/context/AuthContext';
import { getRoleHomeRoute } from '@/shared/constants/roleRoutes';
import { CustomTabBar, TabItem } from '@/components/ui/CustomTabBar';

const TAB_SCREENS = ['index', 'doctors', 'billing', 'pharmacy', 'departments', 'wards', 'profile'];

export default function AdminLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('index');

  const tabs: TabItem[] = [
    { key: 'index', title: 'System', icon: '⚙️' },
    { key: 'doctors', title: 'Users', icon: '👥' },
    { key: 'billing', title: 'Finances', icon: '💳' },
    { key: 'pharmacy', title: 'Inventory', icon: '💊' },
    { key: 'departments', title: 'Depts', icon: '🏥' },
    { key: 'wards', title: 'Wards', icon: '🛏️' },
    { key: 'profile', title: 'Profile', icon: '👤' },
  ];

  useEffect(() => {
    const segments = pathname.split('/');
    const screenName = segments[2];
    if (screenName && TAB_SCREENS.includes(screenName)) {
      setActiveTab(screenName);
    }
  }, [pathname]);

  const handleTabPress = (tabKey: string) => {
    setActiveTab(tabKey);
    const tabPathMap: Record<string, string> = {
      index: '/(admin)',
      doctors: '/(admin)/doctors',
      billing: '/(admin)/billing',
      pharmacy: '/(admin)/pharmacy',
      departments: '/(admin)/departments',
      wards: '/(admin)/wards',
      profile: '/(admin)/profile',
    };
    const path = tabPathMap[tabKey] ?? `/(admin)/${tabKey}`;
    router.push(path as any);
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

  if (user.role !== 'admin') {
    return <Redirect href={getRoleHomeRoute(user.role) ?? '/login'} />;
  }

  return (
    <View style={styles.container}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.background },
        }}
      >
        {/* Main tab screens */}
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="doctors" options={{ headerShown: false }} />
        <Stack.Screen name="billing" options={{ headerShown: false }} />
        <Stack.Screen name="pharmacy" options={{ headerShown: false }} />
        <Stack.Screen name="departments" options={{ headerShown: false }} />
        <Stack.Screen name="wards" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ headerShown: false }} />

        {/* Detail pages with headers */}
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

      {/* Custom Tab Bar */}
      <CustomTabBar activeTab={activeTab} onTabPress={handleTabPress} tabs={tabs} />
    </View>
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
