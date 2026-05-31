import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius, Shadow, Spacing, Typography } from '../ui';
import { subscribePrintToast } from '../../utils/printQueue';

/** Global toast: "Kitchen - printing" while the print queue runs. */
export default function PrintToastHost() {
  const insets = useSafeAreaInsets();
  const [printerName, setPrinterName] = useState<string | null>(null);

  useEffect(() => subscribePrintToast(setPrinterName), []);

  if (!printerName) return null;

  return (
    <View style={[styles.wrap, { top: insets.top + Spacing.sm }]} pointerEvents="none">
      <View style={styles.toast}>
        <ActivityIndicator size="small" color={Colors.white} />
        <Ionicons name="print-outline" size={18} color={Colors.white} />
        <Text style={styles.text}>{printerName} — printing</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
    elevation: 20,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.text,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    ...Shadow.md,
  },
  text: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: Typography.sm,
  },
});
