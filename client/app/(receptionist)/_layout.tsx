import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import { Redirect, Stack, useRouter, usePathname } from 'expo-router';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/shared/context/AuthContext';
import { getRoleHomeRoute } from '@/shared/constants/roleRoutes';
import { ROLES } from '@/shared/constants/roles';
import { CustomTabBar, TabItem } from '@/components/ui/CustomTabBar';

const TAB_SCREENS = ['index', 'beds', 'patients', 'billing', 'medications', 'profile'];

export default function ReceptionistLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('index');

  const tabs: TabItem[] = [
    { key: 'index', title: 'Dashboard', icon: 'home' },
    { key: 'beds', title: 'Beds', icon: 'layers' },
    { key: 'patients', title: 'Patients', icon: 'users' },
    { key: 'billing', title: 'Billing', icon: 'dollar-sign' },
    { key: 'medications', title: 'Meds', icon: 'package' },
    { key: 'profile', title: 'Profile', icon: 'user' },
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
    const path: string = tabKey === 'index' ? '/(receptionist)' : `/(receptionist)/${tabKey}`;
    router.push(path);
  };

  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.primary }]}>
        <Text style={styles.loadingTitle}>Pulse</Text>
        <Text style={styles.loadingSubtitle}>Ward Portal</Text>
        <ActivityIndicator size="large" color="#FFFFFF" style={styles.loadingSpinner} />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (user.role !== ROLES.RECEPTIONIST) {
    return <Redirect href={getRoleHomeRoute(user.role) ?? '/login'} />;
  }

  const detailHeaderOptions = {
    headerTintColor: theme.primary,
    headerTitleStyle: { fontWeight: '600' as const, fontSize: 16 },
    headerStyle: { backgroundColor: theme.surface },
    headerShadowVisible: false,
    headerBackTitleVisible: false,
  };

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
        <Stack.Screen name="beds/index" options={{ headerShown: false }} />
        <Stack.Screen name="patients/index" options={{ headerShown: false }} />
        <Stack.Screen name="billing/index" options={{ headerShown: false }} />
        <Stack.Screen name="medications/index" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ headerShown: false }} />

        {/* Detail pages with headers */}
        <Stack.Screen
          name="beds/[id]"
          options={{
            headerShown: true,
            title: 'Bed Info',
            ...detailHeaderOptions,
          }}
        />
        <Stack.Screen
          name="patients/[id]"
          options={{
            headerShown: true,
            title: 'Patient Info',
            ...detailHeaderOptions,
          }}
        />
        <Stack.Screen
          name="patients/assign"
          options={{
            headerShown: true,
            title: 'Assign Patient',
            ...detailHeaderOptions,
          }}
        />
        <Stack.Screen
          name="billing/create"
          options={{
            headerShown: true,
            title: 'New Invoice',
            ...detailHeaderOptions,
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
  loadingTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  loadingSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
    marginBottom: 24,
  },
  loadingSpinner: {
    marginTop: 8,
  },
});
