import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Colors } from '../components/ui/theme';

/** App uses a light surface — status bar icons/text should be dark. */
const STATUS_BAR_STYLE = 'dark' as const;

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.background }}>
      <StatusBar style={STATUS_BAR_STYLE} backgroundColor={Colors.background} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}>
        <Stack.Screen name="(drawer)" />
      </Stack>
    </GestureHandlerRootView>
  );
}
