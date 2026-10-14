import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { ColorValue, StyleSheet } from 'react-native';
import { Feather, IconName, Loading } from '../../components/ui';
import { useAccess, useAuth } from '../../lib/auth';
import { colors } from '../../theme';

const icon = (name: IconName) => ({ color, size }: { color: ColorValue; size: number }) => <Feather name={name} color={color as string} size={size - 2} />;

export default function TabsLayout() {
  const { agent, ready } = useAuth();
  const { sees } = useAccess();
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
      {/* team members only get the tabs their account owner allowed */}
      <Tabs.Screen name="cases" options={{ title: 'Cases', tabBarIcon: icon('folder'), href: sees('requests') ? undefined : null }} />
      <Tabs.Screen name="students" options={{ title: 'Students', tabBarIcon: icon('users'), href: sees('students') ? undefined : null }} />
      <Tabs.Screen name="wallet" options={{ title: 'Wallet', tabBarIcon: icon('credit-card'), href: sees('wallet') ? undefined : null }} />
      <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: icon('menu') }} />
    </Tabs>
  );
}
