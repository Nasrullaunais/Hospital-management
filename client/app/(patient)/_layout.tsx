import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import { Redirect, Stack, useRouter, useSegments } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/shared/context/AuthContext';
import { getRoleHomeRoute } from '@/shared/constants/roleRoutes';
import { ROLES } from '@/shared/constants/roles';
import { CustomTabBar, TabItem } from '@/components/ui/CustomTabBar';
import { spacing } from '@/constants/ThemeTokens';

const TAB_SCREENS = ['index', 'doctors', 'appointments', 'profile'];

const DEFAULT_TAB: TabItem = { key: 'index', title: 'Home', icon: 'home' };
const TABS: TabItem[] = [
  { key: 'index', title: 'Home', icon: 'home' },
  { key: 'doctors', title: 'Doctors', icon: 'search' },
  { key: 'appointments', title: 'Appointments', icon: 'calendar' },
  { key: 'profile', title: 'Profile', icon: 'user' },
];

export default function PatientLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const router = useRouter();
  const segments = useSegments();
  const currentSegment = segments[1];
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabItem>(DEFAULT_TAB);

  useEffect(() => {
    if (currentSegment && TAB_SCREENS.includes(currentSegment)) {
      const matching = TABS.find((t) => t.key === currentSegment);
      if (matching) setActiveTab(matching);
    }
  }, [segments, currentSegment]);

  const handleTabPress = (tabKey: string) => {
    const matching = TABS.find((t) => t.key === tabKey);
    if (matching) setActiveTab(matching);
    const path: string = tabKey === 'index' ? '/(patient)' : `/(patient)/${tabKey}`;
    router.push(path);
  };

  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.primary }]}>
        <Text style={styles.pulseBrand}>Pulse</Text>
        <Text style={styles.pulseSubtitle}>Patient Portal</Text>
        <ActivityIndicator
          size="large"
          color={colorScheme === 'dark' ? theme.accent : '#FFFFFF'}
          style={styles.loadingSpinner}
        />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (user.role !== ROLES.PATIENT) {
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
        <Stack.Screen name="index" />
        <Stack.Screen name="doctors/index" />
        <Stack.Screen name="appointments/index" />
        <Stack.Screen
          name="profile"
          options={{
            headerShown: true,
            title: 'Profile',
            headerTintColor: theme.primary,
            headerTitleStyle: { fontWeight: '600', fontSize: 16 },
            headerStyle: { backgroundColor: theme.surface },
            headerShadowVisible: false,
            headerBackTitleVisible: false,
          }}
        />
        <Stack.Screen
          name="records/index"
          options={{
            headerShown: true,
            title: 'Medical Records',
            headerTintColor: theme.primary,
            headerTitleStyle: { fontWeight: '600', fontSize: 16 },
            headerStyle: { backgroundColor: theme.surface },
            headerShadowVisible: false,
            headerBackTitleVisible: false,
          }}
        />
        <Stack.Screen
          name="billing/index"
          options={{
            headerShown: true,
            title: 'Invoices & Billing',
            headerTintColor: theme.primary,
            headerTitleStyle: { fontWeight: '600', fontSize: 16 },
            headerStyle: { backgroundColor: theme.surface },
            headerShadowVisible: false,
            headerBackTitleVisible: false,
          }}
        />
        <Stack.Screen
          name="wards/index"
          options={{
            headerShown: true,
            title: 'Wards',
            headerTintColor: theme.primary,
            headerTitleStyle: { fontWeight: '600', fontSize: 16 },
            headerStyle: { backgroundColor: theme.surface },
            headerShadowVisible: false,
            headerBackTitleVisible: false,
          }}
        />
        <Stack.Screen
          name="prescriptions/index"
          options={{
            headerShown: true,
            title: 'Prescriptions',
            headerTintColor: theme.primary,
            headerTitleStyle: { fontWeight: '600', fontSize: 16 },
            headerStyle: { backgroundColor: theme.surface },
            headerShadowVisible: false,
            headerBackTitleVisible: false,
          }}
        />
        <Stack.Screen
          name="doctors/[id]"
          options={{
            headerShown: true,
            title: 'Doctor Profile',
            headerTintColor: theme.primary,
            headerTitleStyle: { fontWeight: '600', fontSize: 16 },
            headerStyle: { backgroundColor: theme.surface },
            headerShadowVisible: false,
            headerBackTitleVisible: false,
          }}
        />
        <Stack.Screen
          name="appointments/book"
          options={{
            headerShown: true,
            title: 'New Appointment',
            headerTintColor: theme.primary,
            headerTitleStyle: { fontWeight: '600', fontSize: 16 },
            headerStyle: { backgroundColor: theme.surface },
            headerShadowVisible: false,
            headerBackTitleVisible: false,
          }}
        />
        <Stack.Screen
          name="billing/[id]"
          options={{
            headerShown: true,
            title: 'Invoice Details',
            headerTintColor: theme.primary,
            headerTitleStyle: { fontWeight: '600', fontSize: 16 },
            headerStyle: { backgroundColor: theme.surface },
            headerShadowVisible: false,
            headerBackTitleVisible: false,
          }}
        />
        <Stack.Screen
          name="billing/pay/[id]"
          options={{
            headerShown: true,
            title: 'Make Payment',
            headerTintColor: theme.primary,
            headerTitleStyle: { fontWeight: '600', fontSize: 16 },
            headerStyle: { backgroundColor: theme.surface },
            headerShadowVisible: false,
            headerBackTitleVisible: false,
          }}
        />
        <Stack.Screen
          name="billing/pay/confirm/[id]"
          options={{
            headerShown: true,
            title: 'Confirm Payment',
            headerTintColor: theme.primary,
            headerTitleStyle: { fontWeight: '600', fontSize: 16 },
            headerStyle: { backgroundColor: theme.surface },
            headerShadowVisible: false,
            headerBackTitleVisible: false,
          }}
        />
        <Stack.Screen
          name="billing/pay/success/[id]"
          options={{
            headerShown: true,
            title: 'Payment',
            headerTintColor: theme.primary,
            headerTitleStyle: { fontWeight: '600', fontSize: 16 },
            headerStyle: { backgroundColor: theme.surface },
            headerShadowVisible: false,
            headerBackTitleVisible: false,
            headerBackVisible: false,
          }}
        />
        <Stack.Screen
          name="wards/[id]"
          options={{
            headerShown: true,
            title: 'Ward Info',
            headerTintColor: theme.primary,
            headerTitleStyle: { fontWeight: '600', fontSize: 16 },
            headerStyle: { backgroundColor: theme.surface },
            headerShadowVisible: false,
            headerBackTitleVisible: false,
          }}
        />
        <Stack.Screen
          name="prescriptions/[id]"
          options={{
            headerShown: true,
            title: 'Prescription Info',
            headerTintColor: theme.primary,
            headerTitleStyle: { fontWeight: '600', fontSize: 16 },
            headerStyle: { backgroundColor: theme.surface },
            headerShadowVisible: false,
            headerBackTitleVisible: false,
          }}
        />
      </Stack>

      <CustomTabBar activeTab={activeTab.key} onTabPress={handleTabPress} tabs={TABS} />
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
  pulseBrand: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  pulseSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 1,
    marginBottom: spacing.xl,
  },
  loadingSpinner: {
    marginTop: spacing.md,
  },
});
