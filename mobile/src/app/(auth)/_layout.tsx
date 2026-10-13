import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { colors } from '../../theme';

export default function AuthLayout() {
  const { agent, ready } = useAuth();
  if (ready && agent) return <Redirect href="/(tabs)" />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />;
}
