import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import OnOffToggle from '../ui/OnOffToggle';
import { Colors, Spacing, Typography } from '../ui';

type Props = {
  title: string;
  description?: string;
  value: boolean;
  onChange: (on: boolean) => void;
  disabled?: boolean;
  isLast?: boolean;
};

export default function PrinterOptionRow({
  title,
  description,
  value,
  onChange,
  disabled,
  isLast,
}: Props) {
  return (
    <View style={[styles.row, !isLast && styles.rowBorder]}>
      <View style={styles.textCol}>
        <Text style={styles.title}>{title}</Text>
        {description ? <Text style={styles.desc}>{description}</Text> : null}
      </View>
      <OnOffToggle value={value} onChange={onChange} disabled={disabled} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  textCol: { flex: 1 },
  title: { color: Colors.text, fontSize: Typography.sm, fontWeight: '700' },
  desc: { color: Colors.textMuted, fontSize: Typography.xs, marginTop: 2, lineHeight: 16 },
});
