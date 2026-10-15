import { useState } from 'react';
import { Text } from 'react-native';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { Button, Field, Screen } from '../components/ui';
import { api } from '../lib/api';
import { errorText, goBack, notify } from '../lib/dialog';
import { colors, space, type } from '../theme';

export default function Password() {
  const headerHeight = useHeaderHeight();
  const [f, setF] = useState({ current: '', next: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  const save = async () => {
    setError('');
    if (f.next.length < 8) return setError('The new password needs at least 8 characters');
    if (f.next !== f.confirm) return setError("The new passwords don't match");
    setBusy(true);
    try {
      await api.changePassword(f.current, f.next);
      notify('Password changed');
      goBack('/profile');
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  };

  return (
    <Screen edges={['bottom']} keyboardOffset={headerHeight}>
      <Field label="Current password" value={f.current} onChangeText={set('current')} secureTextEntry autoComplete="current-password" />
      <Field label="New password" value={f.next} onChangeText={set('next')} secureTextEntry placeholder="At least 8 characters" autoComplete="new-password" />
      <Field label="Repeat new password" value={f.confirm} onChangeText={set('confirm')} secureTextEntry autoComplete="new-password" />
      {error ? <Text style={[type.small, { color: colors.danger, marginBottom: space.md }]}>{error}</Text> : null}
      <Button label="Change password" onPress={save} loading={busy} disabled={!f.current || !f.next || !f.confirm} />
    </Screen>
  );
}
