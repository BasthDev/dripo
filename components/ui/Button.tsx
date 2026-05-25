import React, { useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  Animated,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Typography } from './theme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  iconLeft?: keyof typeof Ionicons.glyphMap;
  iconRight?: keyof typeof Ionicons.glyphMap;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const variantStyles: Record<ButtonVariant, { bg: string; border?: string; text: string }> = {
  primary: { bg: Colors.primary, text: Colors.white },
  secondary: { bg: Colors.surfaceElevated, text: Colors.text },
  outline: { bg: Colors.transparent, border: Colors.primary, text: Colors.primary },
  ghost: { bg: Colors.transparent, text: Colors.textSecondary },
  danger: { bg: Colors.error, text: Colors.white },
  success: { bg: Colors.success, text: Colors.textInverse },
};

const sizeMap: Record<ButtonSize, { paddingH: number; paddingV: number; fontSize: number; iconSize: number }> = {
  sm: { paddingH: Spacing.md, paddingV: Spacing.sm - 2, fontSize: Typography.sm, iconSize: 14 },
  md: { paddingH: Spacing.lg, paddingV: Spacing.md, fontSize: Typography.md, iconSize: 16 },
  lg: { paddingH: Spacing.xxl, paddingV: Spacing.lg, fontSize: Typography.lg, iconSize: 18 },
};

export default function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  iconLeft,
  iconRight,
  fullWidth = false,
  style,
  textStyle,
}: ButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const v = variantStyles[variant];
  const s = sizeMap[size];

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 40 }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40 }).start();
  };

  const isDisabled = disabled || loading;

  return (
    <Animated.View style={[{ transform: [{ scale }] }, fullWidth && styles.fullWidth]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        activeOpacity={1}
        style={[
          styles.base,
          {
            backgroundColor: v.bg,
            borderColor: v.border ?? Colors.transparent,
            borderWidth: v.border ? 1.5 : 0,
            paddingHorizontal: s.paddingH,
            paddingVertical: s.paddingV,
            opacity: isDisabled ? 0.5 : 1,
          },
          fullWidth && styles.fullWidth,
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={v.text} size="small" />
        ) : (
          <View style={styles.row}>
            {iconLeft && (
              <Ionicons
                name={iconLeft}
                size={s.iconSize}
                color={v.text}
                style={styles.iconLeft}
              />
            )}
            <Text style={[styles.label, { color: v.text, fontSize: s.fontSize }, textStyle]}>
              {label}
            </Text>
            {iconRight && (
              <Ionicons
                name={iconRight}
                size={s.iconSize}
                color={v.text}
                style={styles.iconRight}
              />
            )}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  iconLeft: {
    marginRight: Spacing.sm,
  },
  iconRight: {
    marginLeft: Spacing.sm,
  },
});
