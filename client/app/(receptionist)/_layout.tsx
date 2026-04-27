import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { Redirect, Stack, useRouter, usePathname } from 'expo-router';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/shared/context/AuthContext';
import { getRoleHomeRoute } from '@/shared/constants/roleRoutes';
import { CustomTabBar, TabItem } from '@/components/ui/CustomTabBar';

const TAB_SCREENS = ['index', 'beds', 'patients', 'medications', 'profile'];

export default function ReceptionistLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('index');

  const tabs: TabItem[] = [
    { key: 'index', title: 'Dashboard', icon: 'home' },
    { key: 'beds', title: 'Beds', icon: 'home' },
    { key: 'patients', title: 'Patients', icon: 'users' },
    { key: 'medications', title: 'Medications', icon: 'package' },
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
      <View style={[styles.loading, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (user.role !== 'receptionist') {
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
        <Stack.Screen name="beds/index" options={{ headerShown: false }} />
        <Stack.Screen name="patients/index" options={{ headerShown: false }} />
        <Stack.Screen name="medications/index" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ headerShown: false }} />

        {/* Detail pages with headers */}
        <Stack.Screen
          name="beds/[id]"
          options={{
            headerShown: true,
            title: 'Bed Details',
            headerStyle: { backgroundColor: theme.surface },
            headerTintColor: theme.text,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="patients/[id]"
          options={{
            headerShown: true,
            title: 'Patient Details',
            headerStyle: { backgroundColor: theme.surface },
            headerTintColor: theme.text,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="medications/[id]"
          options={{
            headerShown: true,
            title: 'Medication Details',
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
