import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { BackHandler } from 'react-native';

/** Blocks hardware / gesture back while the screen is focused (e.g. after checkout). */
export function usePreventScreenBack(enabled = true) {
  useFocusEffect(
    useCallback(() => {
      if (!enabled) return;
      const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
      return () => sub.remove();
    }, [enabled])
  );
}
