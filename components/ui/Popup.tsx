import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import Button from './Button';
import { Colors, Radius, Shadow, Spacing, Typography } from './theme';

interface PopupAction {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  icon?: keyof typeof Ionicons.glyphMap;
}

interface PopupProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  actions?: PopupAction[];
  dismissable?: boolean;
  children?: React.ReactNode;
  contentStyle?: ViewStyle;
}

export default function Popup({
  visible,
  onClose,
  title,
  description,
  icon,
  iconColor = Colors.primary,
  actions = [],
  dismissable = true,
  children,
  contentStyle,
}: PopupProps) {
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.9)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(cardScale, { toValue: 1, speed: 25, bounciness: 6, useNativeDriver: true }),
        Animated.timing(cardOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(cardScale, { toValue: 0.92, duration: 160, useNativeDriver: true }),
        Animated.timing(cardOpacity, { toValue: 0, duration: 160, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={dismissable ? onClose : undefined}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ── Backdrop ── */}
        <Animated.View
          style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdropOpacity }]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={dismissable ? onClose : undefined}
          />
        </Animated.View>

        {/* ── Card ── */}
        <Animated.View
          style={[
            styles.card,
            { opacity: cardOpacity, transform: [{ scale: cardScale }] },
            contentStyle,
          ]}
        >
          {/* Close button */}
          {dismissable && (
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Optional header icon */}
            {icon && (
              <View style={[styles.iconCircle, { backgroundColor: iconColor + '22' }]}>
                <Ionicons name={icon} size={32} color={iconColor} />
              </View>
            )}

            {title && <Text style={styles.title}>{title}</Text>}
            {description && <Text style={styles.description}>{description}</Text>}

            {/* Custom children slot */}
            {children && <View style={styles.childrenSlot}>{children}</View>}

            {/* Actions */}
            {actions.length > 0 && (
              <View style={styles.actions}>
                {actions.map((action, index) => (
                  <Button
                    key={index}
                    label={action.label}
                    onPress={action.onPress}
                    variant={action.variant ?? (index === 0 ? 'primary' : 'outline')}
                    iconLeft={action.icon}
                    fullWidth
                    size="md"
                  />
                ))}
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxl,
  },
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  card: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    overflow: 'hidden',
    ...Shadow.lg,
  },
  closeBtn: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    zIndex: 10,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.full,
    padding: Spacing.xs,
  },
  scrollContent: {
    padding: Spacing.xxl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    color: Colors.text,
    fontSize: Typography.xl,
    fontWeight: '700',
    textAlign: 'center',
  },
  description: {
    color: Colors.textMuted,
    fontSize: Typography.md,
    textAlign: 'center',
    lineHeight: 22,
  },
  childrenSlot: {
    width: '100%',
    marginTop: Spacing.sm,
  },
  actions: {
    width: '100%',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
});
