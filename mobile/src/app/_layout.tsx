import { useEffect, useRef } from 'react';
import { Stack, router, usePathname, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { api } from '../lib/api';
import { registerForPush, urlOf } from '../lib/push';
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

  // push: register this phone once signed in; tapping a notification opens the case or chat it is about
  useEffect(() => {
    if (agent) registerForPush();
  }, [agent?.id, agent?.member?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const lastTap = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (agent && lastTap?.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) router.push(urlOf(lastTap.notification) as never);
  }, [lastTap, agent?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // screen views for the usage report: sent in small batches, never while signed out
  const pathname = usePathname();
  const queue = useRef<string[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!agent || inAuth || !pathname) return;
    queue.current.push(pathname);
    if (timer.current) return;
    timer.current = setTimeout(() => {
      api.trackViews(queue.current.splice(0, 25));
      timer.current = null;
    }, 4000);
  }, [pathname, agent?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
      <Stack.Screen name="refer" options={{ title: 'Request a service', presentation: 'modal' }} />
      <Stack.Screen name="withdraw" options={{ title: 'Withdraw', presentation: 'modal' }} />
      <Stack.Screen name="student/[id]" options={{ title: '' }} />
      <Stack.Screen name="services" options={{ title: 'Services' }} />
      <Stack.Screen name="whatsnew" options={{ title: "What's New" }} />
      <Stack.Screen name="updates" options={{ title: 'Updates' }} />
      <Stack.Screen name="agreement" options={{ title: 'Partner agreement' }} />
      <Stack.Screen name="team" options={{ title: 'Team members' }} />
      <Stack.Screen name="team-member" options={{ title: 'Team member', presentation: 'modal' }} />
      <Stack.Screen name="password" options={{ title: 'Change password' }} />
      <Stack.Screen name="profile" options={{ title: 'Profile' }} />
      <Stack.Screen name="analytics" options={{ title: 'Your analytics' }} />
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
