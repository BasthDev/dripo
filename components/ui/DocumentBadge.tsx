import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Spacing, Typography } from './theme';

export type DocumentBadgeVariant = 'po' | 'si' | 'so';

const ACCENT: Record<DocumentBadgeVariant, string> = {
  po: Colors.secondary,
  si: Colors.primary,
  so: Colors.warning,
};

type Props = {
  label: string;
  documentNo: string;
  variant?: DocumentBadgeVariant;
};

/** Matches purchase order document number styling across PO / SI / SO screens. */
export default function DocumentBadge({
  label,
  documentNo,
  variant = 'po',
}: Props) {
  const accent = ACCENT[variant];
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: accent + '15', borderColor: accent + '40' },
      ]}
    >
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.no, { color: accent }]}>{documentNo}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
  },
  label: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  no: {
    fontSize: Typography.lg,
    fontWeight: '800',
    marginTop: 4,
  },
});
