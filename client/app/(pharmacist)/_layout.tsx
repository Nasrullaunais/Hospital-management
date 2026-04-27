import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { Redirect, Stack, useRouter, usePathname } from 'expo-router';
import type { Href } from 'expo-router';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/shared/context/AuthContext';
import { getRoleHomeRoute } from '@/shared/constants/roleRoutes';
import { CustomTabBar, TabItem } from '@/components/ui/CustomTabBar';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

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
      <View style={[styles.loading, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (user.role !== 'pharmacist') {
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
          {/* Main tab screens */}
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="pharmacy/index" options={{ headerShown: false }} />
          <Stack.Screen name="profile" options={{ headerShown: false }} />

          {/* Hidden screens - no tab bar */}
          <Stack.Screen name="dispense/index" options={{ headerShown: false }} />

          {/* Detail pages with headers */}
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
          <Stack.Screen
            name="dispense/[id]"
            options={{
              headerShown: true,
              title: 'Dispense Details',
              headerStyle: { backgroundColor: theme.surface },
              headerTintColor: theme.text,
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="pharmacy/[id]"
            options={{
              headerShown: true,
              title: 'Medicine Details',
              headerStyle: { backgroundColor: theme.surface },
              headerTintColor: theme.text,
              headerShadowVisible: false,
            }}
          />
        </Stack>

        {/* Custom Tab Bar */}
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
