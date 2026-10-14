import { Alert, Platform } from 'react-native';
import { router, type Href } from 'expo-router';

/** A simple message box that also works when the app runs in a browser. */
export const notify = (title: string, message?: string) =>
  Platform.OS === 'web' ? globalThis.alert?.(message ? `${title}\n\n${message}` : title) : Alert.alert(title, message);

/** Yes/no question. Resolves true when the person confirms. */
export const confirm = (title: string, message: string, action = 'OK', destructive = false) =>
  new Promise<boolean>((resolve) => {
    if (Platform.OS === 'web') return resolve(!!globalThis.confirm?.(`${title}\n\n${message}`));
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: action, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });

/** Go back, or to a sensible screen when there is nothing to go back to (e.g. opened from a link). */
export const goBack = (fallback: Href = '/') => (router.canGoBack() ? router.back() : router.replace(fallback));

export const errorText = (e: unknown, fallback = 'Something went wrong') => (e instanceof Error ? e.message : fallback);
