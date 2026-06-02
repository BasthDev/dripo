import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Colors, Radius, Shadow, Spacing, Typography } from '../ui';
import { formatRp } from '../../utils/formatCurrency';

export type TableGridTileProps = {
  name: string;
  zone: string;
  hasOrder: boolean;
  total?: number;
  width: number;
  height: number;
  disabled?: boolean;
  hint?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: ViewStyle;
};

export default function TableGridTile({
  name,
  zone,
  hasOrder,
  total = 0,
  width,
  height,
  disabled,
  hint,
  onPress,
  onLongPress,
  style,
}: TableGridTileProps) {
  const compact = width < 110;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.tile,
        { width, height },
        hasOrder ? styles.tileOpen : styles.tileFree,
        pressed && !disabled && styles.tilePressed,
        disabled && styles.tileDisabled,
        style,
      ]}
      disabled={disabled}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <View
        style={[
          styles.accentBar,
          { backgroundColor: hasOrder ? Colors.primary : Colors.surfaceBorder },
        ]}
      />

      <View style={styles.topRow}>
        <View
          style={[
            styles.iconCircle,
            hasOrder ? styles.iconCircleOpen : styles.iconCircleFree,
          ]}
        >
          <Ionicons
            name={hasOrder ? 'restaurant' : 'ellipse-outline'}
            size={compact ? 16 : 18}
            color={hasOrder ? Colors.primary : Colors.textMuted}
          />
        </View>
        <View
          style={[
            styles.statusPill,
            hasOrder ? styles.statusPillOpen : styles.statusPillFree,
          ]}
        >
          <View
            style={[
              styles.statusDot,
              { backgroundColor: hasOrder ? Colors.success : Colors.textMuted },
            ]}
          />
          <Text
            style={[
              styles.statusText,
              hasOrder ? styles.statusTextOpen : styles.statusTextFree,
            ]}
            numberOfLines={1}
          >
            {hasOrder ? 'Open' : 'Free'}
          </Text>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={[styles.tableName, compact && styles.tableNameCompact]} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.zone} numberOfLines={1}>
          {zone}
        </Text>
      </View>

      <View style={styles.footer}>
        {hasOrder ? (
          <>
            {total > 0 ? (
              <Text style={[styles.total, compact && styles.totalCompact]} numberOfLines={1}>
                {formatRp(total)}
              </Text>
            ) : (
              <Text style={styles.footerMeta}>Order active</Text>
            )}
            {hint ? (
              <Text style={styles.hint} numberOfLines={1}>
                {hint}
              </Text>
            ) : null}
          </>
        ) : (
          <Text style={styles.freeLabel}>No order</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    overflow: 'hidden',
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.sm,
    ...Shadow.md,
  },
  tileOpen: {
    backgroundColor: '#F5EDE3',
    borderColor: Colors.primary + '35',
  },
  tileFree: {
    backgroundColor: Colors.surface,
  },
  tilePressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  tileDisabled: {
    opacity: 0.72,
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleOpen: {
    backgroundColor: Colors.primary + '18',
  },
  iconCircleFree: {
    backgroundColor: Colors.surfaceElevated,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    maxWidth: '58%',
  },
  statusPillOpen: {
    backgroundColor: Colors.success + '22',
  },
  statusPillFree: {
    backgroundColor: Colors.surfaceElevated,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  statusTextOpen: { color: Colors.success },
  statusTextFree: { color: Colors.textMuted },
  body: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: Spacing.xs,
    minHeight: 36,
  },
  tableName: {
    color: Colors.text,
    fontWeight: '800',
    fontSize: Typography.lg,
    textAlign: 'center',
  },
  tableNameCompact: {
    fontSize: Typography.md,
  },
  zone: {
    color: Colors.textMuted,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
  },
  footer: {
    alignItems: 'center',
    gap: 2,
    minHeight: 28,
  },
  total: {
    color: Colors.primary,
    fontSize: Typography.sm,
    fontWeight: '800',
  },
  totalCompact: {
    fontSize: 11,
  },
  footerMeta: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  hint: {
    color: Colors.primary,
    fontSize: 9,
    fontWeight: '700',
  },
  freeLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontStyle: 'italic',
  },
});
