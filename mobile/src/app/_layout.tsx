import { useEffect } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../lib/auth';
import { Loading } from '../components/ui';
import { colors } from '../theme';

/** Waits for the saved session to load, then keeps signed-out users on the auth screens. */
function Navigator() {
  const { agent, ready } = useAuth();
  const segments = useSegments();
  const inAuth = segments[0] === '(auth)';

  useEffect(() => {
    if (ready && !agent && !inAuth) router.replace('/login');
  }, [ready, agent, inAuth]);

  if (!ready) return <Loading />;

  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '600', fontSize: 16 },
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="case/[id]" options={{ title: '' }} />
      <Stack.Screen name="service/[key]" options={{ title: '' }} />
      <Stack.Screen name="commissions" options={{ title: 'Commissions' }} />
      <Stack.Screen name="rm" options={{ title: 'Relationship manager' }} />
      <Stack.Screen name="refer" options={{ title: 'Refer a student', presentation: 'modal' }} />
      <Stack.Screen name="withdraw" options={{ title: 'Withdraw', presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Navigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
