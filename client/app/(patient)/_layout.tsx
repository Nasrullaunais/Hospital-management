import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { Redirect, Stack, useRouter, usePathname } from 'expo-router';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/shared/context/AuthContext';
import { getRoleHomeRoute } from '@/shared/constants/roleRoutes';
import { CustomTabBar, TabItem } from '@/components/ui/CustomTabBar';

const TAB_SCREENS = ['index', 'doctors', 'appointments', 'profile'];

export default function PatientLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('index');

  const tabs: TabItem[] = [
    { key: 'index', title: 'Home', icon: '🏠' },
    { key: 'doctors', title: 'Doctors', icon: '🩺' },
    { key: 'appointments', title: 'Appointments', icon: '📅' },
    { key: 'profile', title: 'Profile', icon: '👤' },
  ];

  useEffect(() => {
    // Extract the current screen from pathname
    // pathname format: /(patient)/screen or /(patient)/screen/detail
    const segments = pathname.split('/');
    const screenName = segments[2]; // First segment after (patient)
    if (screenName && TAB_SCREENS.includes(screenName)) {
      setActiveTab(screenName);
    }
  }, [pathname]);

  const handleTabPress = (tabKey: string) => {
    setActiveTab(tabKey);
    const path = tabKey === 'index' ? '/(patient)' : `/(patient)/${tabKey}`;
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
        <Stack.Screen name="doctors" />
        <Stack.Screen name="appointments" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="records" />
        <Stack.Screen name="billing" />
        <Stack.Screen name="departments" />
        <Stack.Screen name="wards" />
        <Stack.Screen name="prescriptions" />
        <Stack.Screen name="doctors/[id]" options={{ headerShown: true, title: 'Doctor Details', headerStyle: { backgroundColor: theme.surface }, headerTintColor: theme.text, headerShadowVisible: false }} />
        <Stack.Screen name="appointments/book" options={{ headerShown: true, title: 'Book Appointment', headerStyle: { backgroundColor: theme.surface }, headerTintColor: theme.text, headerShadowVisible: false }} />
        <Stack.Screen name="billing/[id]" options={{ headerShown: true, title: 'Billing Details', headerStyle: { backgroundColor: theme.surface }, headerTintColor: theme.text, headerShadowVisible: false }} />
        <Stack.Screen name="departments/[id]" options={{ headerShown: true, title: 'Department Details', headerStyle: { backgroundColor: theme.surface }, headerTintColor: theme.text, headerShadowVisible: false }} />
        <Stack.Screen name="wards/[id]" options={{ headerShown: true, title: 'Ward Details', headerStyle: { backgroundColor: theme.surface }, headerTintColor: theme.text, headerShadowVisible: false }} />
        <Stack.Screen name="prescriptions/[id]" options={{ headerShown: true, title: 'Prescription Details', headerStyle: { backgroundColor: theme.surface }, headerTintColor: theme.text, headerShadowVisible: false }} />
      </Stack>

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
