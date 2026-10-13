import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { ColorValue, StyleSheet } from 'react-native';
import { Feather, IconName, Loading } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { colors } from '../../theme';

const icon = (name: IconName) => ({ color, size }: { color: ColorValue; size: number }) => <Feather name={name} color={color as string} size={size - 2} />;

export default function TabsLayout() {
  const { agent, ready } = useAuth();
  if (!ready) return <Loading />;
  if (!agent) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.faint,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
        tabBarStyle: { borderTopColor: colors.line, borderTopWidth: StyleSheet.hairlineWidth, backgroundColor: colors.bg, elevation: 0 },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: icon('home') }} />
      <Tabs.Screen name="cases" options={{ title: 'Cases', tabBarIcon: icon('folder') }} />
      <Tabs.Screen name="services" options={{ title: 'Services', tabBarIcon: icon('grid') }} />
      <Tabs.Screen name="wallet" options={{ title: 'Wallet', tabBarIcon: icon('credit-card') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: icon('user') }} />
    </Tabs>
  );
}
