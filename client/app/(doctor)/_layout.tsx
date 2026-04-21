import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { Redirect, Stack, useRouter, usePathname } from 'expo-router';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/shared/context/AuthContext';
import { getRoleHomeRoute } from '@/shared/constants/roleRoutes';
import { CustomTabBar, TabItem } from '@/components/ui/CustomTabBar';

const TAB_SCREENS = ['index', 'appointments', 'records', 'profile'];

export default function DoctorLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('index');

  const tabs: TabItem[] = [
    { key: 'index', title: 'Home', icon: '🏠' },
    { key: 'appointments', title: 'Schedule', icon: '📅' },
    { key: 'records', title: 'Patients', icon: '📋' },
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
    const path = tabKey === 'index' ? '/(doctor)' : `/(doctor)/${tabKey}`;
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
        <Stack.Screen name="appointments" options={{ headerShown: false }} />
        <Stack.Screen name="records" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ headerShown: false }} />

        {/* Detail pages with headers */}
        <Stack.Screen
          name="records/add-record"
          options={{
            headerShown: true,
            title: 'Add Record',
            headerStyle: { backgroundColor: theme.surface },
            headerTintColor: theme.text,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="records/[id]"
          options={{
            headerShown: true,
            title: 'Record Details',
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
