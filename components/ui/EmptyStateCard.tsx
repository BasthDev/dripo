import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from './Button';
import { Colors, Spacing, Radius, Typography } from './theme';

interface EmptyStateCardProps {
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  style?: ViewStyle;
}

export default function EmptyStateCard({
  icon = 'file-tray-outline',
  iconColor = Colors.primary,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  style,
}: EmptyStateCardProps) {
  return (
    <View style={[styles.container, style]}>
      {/* ── Glow circle behind icon ── */}
      <View style={[styles.glowCircle, { backgroundColor: iconColor + '18' }]}>
        <View style={[styles.iconCircle, { backgroundColor: iconColor + '30' }]}>
          <Ionicons name={icon} size={40} color={iconColor} />
        </View>
      </View>

      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}

      {(actionLabel || secondaryActionLabel) && (
        <View style={styles.actions}>
          {actionLabel && (
            <Button
              label={actionLabel}
              onPress={onAction}
              variant="primary"
              size="md"
              fullWidth
            />
          )}
          {secondaryActionLabel && (
            <Button
              label={secondaryActionLabel}
              onPress={onSecondaryAction}
              variant="outline"
              size="md"
              fullWidth
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xxxl,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderStyle: 'dashed',
    gap: Spacing.md,
  },
  glowCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: Colors.text,
    fontSize: Typography.lg,
    fontWeight: '700',
    textAlign: 'center',
  },
  description: {
    color: Colors.textMuted,
    fontSize: Typography.sm,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },
  actions: {
    width: '100%',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
});
