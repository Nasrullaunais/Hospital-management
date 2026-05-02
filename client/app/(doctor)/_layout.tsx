import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import { Redirect, Stack, useRouter, usePathname } from 'expo-router';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/shared/context/AuthContext';
import { getRoleHomeRoute } from '@/shared/constants/roleRoutes';
import { CustomTabBar, TabItem } from '@/components/ui/CustomTabBar';
import { spacing, radius, shadows } from '@/constants/ThemeTokens';

const VALID_TAB_KEYS = ['index', 'appointments', 'records', 'profile'] as const;
type TabKey = typeof VALID_TAB_KEYS[number];

export default function DoctorLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('index');

  const tabs: TabItem[] = [
    { key: 'index', title: 'Home', icon: 'home' },
    { key: 'appointments', title: 'Schedule', icon: 'calendar' },
    { key: 'records', title: 'Patients', icon: 'users' },
    { key: 'profile', title: 'Profile', icon: 'user' },
  ];

  useEffect(() => {
    const segments = pathname.split('/');
    const screenName = segments[2];
    if (screenName && VALID_TAB_KEYS.includes(screenName as TabKey)) {
      setActiveTab(screenName as TabKey);
    }
  }, [pathname]);

  const handleTabPress = (tabKey: string) => {
    setActiveTab(tabKey);
    const path: string = tabKey === 'index' ? '/(doctor)' : `/(doctor)/${tabKey}`;
    router.push(path);
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingBrand}>Pulse</Text>
        <Text style={styles.loadingSubtitle}>Doctor Portal</Text>
        <ActivityIndicator size="large" color="#F4795B" style={{ marginTop: 24 }} />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (user.role !== 'doctor') {
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
        <Stack.Screen name="appointments/index" options={{ headerShown: false }} />
        <Stack.Screen name="records/index" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ headerShown: false }} />

        {/* Detail pages with headers */}
        <Stack.Screen
          name="records/add-record"
          options={{
            headerShown: true,
            title: 'New Patient Record',
            headerStyle: { backgroundColor: theme.background },
            headerTintColor: theme.primary,
            headerTitleStyle: { fontWeight: '600', fontSize: 16 },
            headerShadowVisible: false,
            headerBackTitleVisible: false,
          }}
        />
        <Stack.Screen
          name="records/[id]"
          options={{
            headerShown: true,
            title: 'Record Info',
            headerStyle: { backgroundColor: theme.background },
            headerTintColor: theme.primary,
            headerTitleStyle: { fontWeight: '600', fontSize: 16 },
            headerShadowVisible: false,
            headerBackTitleVisible: false,
          }}
        />

        {/* Lab Reports (Member 4) */}
        <Stack.Screen
          name="lab-reports/index"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="lab-reports/add"
          options={{
            headerShown: true,
            title: 'New Lab Report',
            headerStyle: { backgroundColor: theme.background },
            headerTintColor: theme.primary,
            headerTitleStyle: { fontWeight: '600', fontSize: 16 },
            headerShadowVisible: false,
            headerBackTitleVisible: false,
          }}
        />
        <Stack.Screen
          name="lab-reports/[id]"
          options={{
            headerShown: true,
            title: 'Lab Report',
            headerStyle: { backgroundColor: theme.background },
            headerTintColor: theme.primary,
            headerTitleStyle: { fontWeight: '600', fontSize: 16 },
            headerShadowVisible: false,
            headerBackTitleVisible: false,
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
    backgroundColor: '#1B2A4A',
  },
  loadingBrand: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  loadingSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 6,
    letterSpacing: 1,
  },
});
