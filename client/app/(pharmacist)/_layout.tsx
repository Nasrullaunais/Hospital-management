import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import { Redirect, Stack, useRouter, usePathname } from 'expo-router';
import type { Href } from 'expo-router';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/shared/context/AuthContext';
import { getRoleHomeRoute } from '@/shared/constants/roleRoutes';
import { CustomTabBar, TabItem } from '@/components/ui/CustomTabBar';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { spacing, typography } from '@/constants/ThemeTokens';

const TAB_SCREENS = ['index', 'pharmacy', 'dispense', 'profile'] as const;
type TabScreen = typeof TAB_SCREENS[number];

const ROUTE_MAP: Record<TabScreen, Href> = {
  index: '/(pharmacist)',
  pharmacy: '/(pharmacist)/pharmacy',
  dispense: '/(pharmacist)/dispense',
  profile: '/(pharmacist)/profile',
} as const;

export default function PharmacistLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('index');

  const tabs: TabItem[] = [
    { key: 'index', title: 'Home', icon: 'home' },
    { key: 'pharmacy', title: 'Inventory', icon: 'package' },
    { key: 'dispense', title: 'Dispense', icon: 'box' },
    { key: 'profile', title: 'Profile', icon: 'user' },
  ];

  useEffect(() => {
    const segments = pathname.split('/');
    const screenName = segments[2];
    if (screenName && TAB_SCREENS.includes(screenName as TabScreen)) {
      setActiveTab(screenName);
    }
  }, [pathname]);

  const handleTabPress = (tabKey: string) => {
    if (!TAB_SCREENS.includes(tabKey as TabScreen)) return;
    setActiveTab(tabKey);
    router.push(ROUTE_MAP[tabKey as TabScreen]);
  };

  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: '#1B2A4A' }]}>
        <Text style={styles.loadingTitle}>Pulse</Text>
        <Text style={styles.loadingSubtitle}>Pharmacy Portal</Text>
        <ActivityIndicator size="large" color="#FFFFFF" style={{ marginTop: spacing.lg }} />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (user.role !== 'pharmacist') {
    return <Redirect href={getRoleHomeRoute(user.role) ?? '/login'} />;
  }

  const headerOptions = {
    headerTintColor: theme.primary,
    headerTitleStyle: { fontWeight: '600' as const, fontSize: 16 },
    headerStyle: { backgroundColor: theme.surface },
    headerShadowVisible: false,
    headerBackTitleVisible: false,
  };

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
          <Stack.Screen name="pharmacy/index" options={{ headerShown: false }} />
          <Stack.Screen name="profile" options={{ headerShown: false }} />

          <Stack.Screen name="dispense/index" options={{ headerShown: false }} />
          <Stack.Screen
            name="pharmacy/add-medicine"
            options={{
              headerShown: true,
              title: 'New Medication',
              ...headerOptions,
            }}
          />
          <Stack.Screen
            name="dispense/[id]"
            options={{
              headerShown: true,
              title: 'Prescription Info',
              ...headerOptions,
            }}
          />
          <Stack.Screen
            name="pharmacy/[id]"
            options={{
              headerShown: true,
              title: 'Medication Info',
              ...headerOptions,
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
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  loadingSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: spacing.xs,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
