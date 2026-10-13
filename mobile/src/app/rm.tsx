import { useHeaderHeight } from 'expo-router/react-navigation';
import { View } from 'react-native';
import { Chat } from '../components/Chat';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { colors } from '../theme';

export default function RmChat() {
  const { agent } = useAuth();
  const headerHeight = useHeaderHeight();
  const name = agent?.rm.name ?? 'Relationship manager';

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Chat
        load={api.rmMessages}
        send={api.sendRmMessage}
        theirName={name.split(' ')[0]}
        placeholder={`Message ${name.split(' ')[0]}`}
        keyboardOffset={headerHeight}
      />
    </View>
  );
}
