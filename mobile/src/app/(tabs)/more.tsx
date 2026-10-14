import { router } from 'expo-router';
import { Button, Header, List, Row, Screen, Section } from '../../components/ui';
import { ProfileButton } from '../../components/ProfileButton';
import { useAccess, useAuth } from '../../lib/auth';
import { confirm } from '../../lib/dialog';
import { space } from '../../theme';

export default function More() {
  const { agent, signOut } = useAuth();
  const { isOwner, member, sees } = useAccess();
  if (!agent) return null;

  const askSignOut = async () => {
    if (await confirm('Sign out?', 'You can sign back in with your email and password.', 'Sign out', true)) signOut();
  };

  return (
    <Screen>
      <Header left={<ProfileButton />} title="More" />

      <Section>
        <List>
          <Row
            icon="user"
            title={member?.name ?? agent.name}
            subtitle={member ? `${member.role} · ${agent.agency || agent.name}` : 'View and edit your profile'}
            onPress={() => router.push('/profile')}
          />
        </List>
      </Section>

      <Section title="Work">
        <List>
          <Row icon="message-circle" title={`Chat with ${agent.rm.name}`} subtitle="Relationship manager" onPress={() => router.push('/rm')} />
          <Row icon="bar-chart-2" title="Your analytics" subtitle="Referrals, completion and earnings" onPress={() => router.push('/analytics')} />
          {sees('whatsnew') ? <Row icon="book-open" title="What's New" subtitle="Guides and market updates" onPress={() => router.push('/whatsnew')} /> : null}
          {sees('services') ? <Row icon="grid" title="Services" subtitle="Browse and refer into any service" onPress={() => router.push('/services')} /> : null}
          {sees('commissions') ? <Row icon="percent" title="Commission structure" onPress={() => router.push('/commissions')} /> : null}
          <Row icon="bell" title="Updates" subtitle="Replies from the desk and your RM" onPress={() => router.push('/updates')} />
        </List>
      </Section>

      <Section title="Account">
        <List>
          {isOwner ? <Row icon="file-text" title="Partner agreement" subtitle={agent.agreement.number || 'Your signed agreement'} onPress={() => router.push('/agreement')} /> : null}
          {isOwner ? <Row icon="users" title="Team members" subtitle="Logins and permissions for your staff" onPress={() => router.push('/team')} /> : null}
          <Row icon="key" title="Change password" onPress={() => router.push('/password')} />
          <Row icon="lock" title="Data protection" subtitle="Records are visible only to you, your team and your case desk" />
        </List>
      </Section>

      <Button label="Sign out" variant="ghost" onPress={askSignOut} style={{ marginTop: space.xl }} />
    </Screen>
  );
}
