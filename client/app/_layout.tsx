import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useCallback } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useColorScheme } from '@/components/useColorScheme';
import { AuthProvider } from '@/shared/context/AuthContext';
import { ToastProvider, useToast } from '@/shared/providers/ToastProvider';
import { registerToast } from '@/shared/api/client';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};

SplashScreen.preventAutoHideAsync();

function ToastSetup({ children }: { children: React.ReactNode }) {
  const toast = useToast();

  useEffect(() => {
    registerToast(toast.show);
  }, [toast]);

  return <>{children}</>;
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  return (
    <ToastProvider>
      <ToastSetup>
        <SafeAreaProvider>
          <AuthProvider>
            {!loaded ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
              </View>
            ) : (
              <RootLayoutNav />
            )}
          </AuthProvider>
        </SafeAreaProvider>
      </ToastSetup>
    </ToastProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(patient)" />
        <Stack.Screen name="(doctor)" />
        <Stack.Screen name="(pharmacist)" />
        <Stack.Screen name="(admin)" />
        <Stack.Screen name="(receptionist)" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
      </Stack>
    </ThemeProvider>
  );
}
