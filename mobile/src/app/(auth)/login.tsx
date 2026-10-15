import { useState } from 'react';
import { Image, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { Button, Field, Screen } from '../../components/ui';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { colors, space, type } from '../../theme';

export default function Login() {
  const { signIn, notice } = useAuth();
  const [forgot, setForgot] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      const { token, agent } = await api.login(email.trim(), password);
      await signIn(token, agent);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign in failed');
    } finally {
      setBusy(false);
    }
  };

  return (
      <Screen edges={['top', 'bottom']}>
        <View style={{ paddingTop: space.xxl * 1.5 }}>
          <Image source={require('../../../assets/logo.png')} style={{ width: 132, height: 113 }} resizeMode="contain" />
          <Text style={[type.display, { marginTop: space.xxl }]}>Partner sign in</Text>
          <Text style={[type.small, { marginTop: space.xs, marginBottom: space.xxl }]}>
            Service requests, case tracking and your wallet in one place.
          </Text>

          <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@agency.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
          <Field label="Password" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry autoComplete="password" onSubmitEditing={submit} />
          {!error && notice ? <Text style={[type.small, { color: colors.danger, marginBottom: space.md }]}>{notice}</Text> : null}
          {error ? <Text style={[type.small, { color: colors.danger, marginBottom: space.md }]}>{error}</Text> : null}

          <Button label="Sign in" onPress={submit} loading={busy} disabled={!email || !password} />

          <Text style={[type.small, { color: colors.accent, fontWeight: '600', textAlign: 'center', marginTop: space.lg }]} onPress={() => setForgot(!forgot)}>
            Forgot password?
          </Text>
          {forgot ? (
            <Text style={[type.small, { textAlign: 'center', marginTop: space.sm }]}>
              Call your relationship manager or write to vas@universe.com from your registered email for a temporary password.
              Team members can ask their account owner to set a new one.
            </Text>
          ) : null}

          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: space.xl, gap: 4 }}>
            <Text style={type.small}>New partner?</Text>
            <Link href="/signup" style={[type.small, { color: colors.accent, fontWeight: '600' }]}>Create an account</Link>
          </View>

        </View>
      </Screen>
  );
}
