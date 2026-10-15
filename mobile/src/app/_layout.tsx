import { useEffect, useRef } from 'react';
import { Stack, router, usePathname, useSegments } from 'expo-router';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { api } from '../lib/api';
import { pushTarget, registerForPush } from '../lib/push';
import { AuthProvider, useAuth } from '../lib/auth';
import { routeFor, UpdatesProvider } from '../lib/updates';
import { InAppBanner } from '../components/InAppBanner';
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
  useEffect(() => {
    if (!agent || Platform.OS === 'web') return;
    const open = (r: Notifications.NotificationResponse | null) => {
      if (r?.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
      const { notificationId, link } = pushTarget(r.notification);
      if (notificationId) api.markNotificationsRead([notificationId]).catch(() => {});
      router.push((routeFor(link) ?? '/updates') as never);
    };
    Notifications.getLastNotificationResponseAsync().then(open).catch(() => {}); // the tap that opened the app
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, [agent?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
      <Stack.Screen name="updates" options={{ title: 'Notifications' }} />
      <Stack.Screen name="agreement" options={{ title: 'Partner agreement' }} />
      <Stack.Screen name="team" options={{ title: 'Team members' }} />
      <Stack.Screen name="team-member" options={{ title: 'Team member', presentation: 'modal' }} />
      <Stack.Screen name="password" options={{ title: 'Change password' }} />
      <Stack.Screen name="profile" options={{ title: 'Profile' }} />
      <Stack.Screen name="notification-settings" options={{ title: 'Notification settings' }} />
      <Stack.Screen name="analytics" options={{ title: 'Your analytics' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <UpdatesProvider>
          <Navigator />
          <InAppBanner />
        </UpdatesProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
