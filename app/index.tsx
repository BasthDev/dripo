import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { Colors } from '../components/ui';
import { useActivationStore } from '../store/useActivationStore';

export default function Index() {
  const hydrated = useActivationStore(s => s._hasHydrated);
  const licensed = useActivationStore(s => s.isLicensed());

  if (!hydrated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if (!licensed) {
    return <Redirect href="/activation" />;
  }

  return <Redirect href="/(drawer)" />;
}
