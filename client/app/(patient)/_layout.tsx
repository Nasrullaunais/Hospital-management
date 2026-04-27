import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { Redirect, Stack, useRouter, useSegments } from 'expo-router';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/shared/context/AuthContext';
import { getRoleHomeRoute } from '@/shared/constants/roleRoutes';
import { CustomTabBar, TabItem } from '@/components/ui/CustomTabBar';

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
      <View style={[styles.loading, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (user.role !== 'patient') {
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
        <Stack.Screen name="profile" />
        <Stack.Screen name="records/index" />
        <Stack.Screen name="billing/index" />
        <Stack.Screen name="departments/index" />
        <Stack.Screen name="wards/index" />
        <Stack.Screen name="prescriptions/index" />
        <Stack.Screen name="doctors/[id]" options={{ headerShown: true, title: 'Doctor Details', headerStyle: { backgroundColor: theme.surface }, headerTintColor: theme.text, headerShadowVisible: false }} />
        <Stack.Screen name="appointments/book" options={{ headerShown: true, title: 'Book Appointment', headerStyle: { backgroundColor: theme.surface }, headerTintColor: theme.text, headerShadowVisible: false }} />
        <Stack.Screen name="billing/[id]" options={{ headerShown: true, title: 'Billing Details', headerStyle: { backgroundColor: theme.surface }, headerTintColor: theme.text, headerShadowVisible: false }} />
        <Stack.Screen name="departments/[id]" options={{ headerShown: true, title: 'Department Details', headerStyle: { backgroundColor: theme.surface }, headerTintColor: theme.text, headerShadowVisible: false }} />
        <Stack.Screen name="wards/[id]" options={{ headerShown: true, title: 'Ward Details', headerStyle: { backgroundColor: theme.surface }, headerTintColor: theme.text, headerShadowVisible: false }} />
        <Stack.Screen name="prescriptions/[id]" options={{ headerShown: true, title: 'Prescription Details', headerStyle: { backgroundColor: theme.surface }, headerTintColor: theme.text, headerShadowVisible: false }} />
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
});
