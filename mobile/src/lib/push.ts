import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { api } from './api';

/* Push notifications (Firebase on Android). Each phone registers its token with our server after sign-in;
   the server pushes desk and RM replies, case updates, commissions and payouts. */

// show the banner even while the app is open, so updates appear in-app too
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

let current: string | null = null;

/** Asks for permission (Android 13+ shows a prompt once), then registers this phone. Quietly does nothing on web or emulators without Play services. */
export async function registerForPush() {
  if (Platform.OS === 'web' || !Device.isDevice) return null;
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('updates', {
        name: 'Case updates and messages',
        importance: Notifications.AndroidImportance.HIGH,
        lightColor: '#0A66C2',
      });
    }
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return null;
    const { data } = await Notifications.getDevicePushTokenAsync();
    current = String(data);
    await api.registerDevice(current, Platform.OS);
    return current;
  } catch (e) {
    console.warn('push registration failed', e);
    return null;
  }
}

/** Stops pushes to this phone (on sign-out). */
export async function unregisterPush() {
  if (!current) return;
  const t = current;
  current = null;
  await api.unregisterDevice(t).catch(() => {});
}

/** Where a tapped notification should open, e.g. /case/123 */
export const urlOf = (n: Notifications.Notification) => {
  const url = n.request.content.data?.url;
  return typeof url === 'string' && url.startsWith('/') ? url : '/updates';
};
