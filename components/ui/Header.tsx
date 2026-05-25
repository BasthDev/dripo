import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Typography } from './theme';
import { useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';

export type HeaderVariant = 'default' | 'transparent' | 'elevated';

interface HeaderAction {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  badge?: number;
  color?: string;
}

interface HeaderProps {
  title?: string;
  subtitle?: string;
  /** Show a back arrow and call this handler when tapped */
  onBack?: () => void;
  /** Left-side custom icon instead of back arrow */
  leftIcon?: keyof typeof Ionicons.glyphMap;
  onLeftPress?: () => void;
  /** Up to 3 right-side action icons */
  actions?: HeaderAction[];
  variant?: HeaderVariant;
  centerTitle?: boolean;
  style?: ViewStyle;
}

export default function Header({
  title,
  subtitle,
  onBack,
  leftIcon,
  onLeftPress,
  actions = [],
  variant = 'default',
  centerTitle = true,
  style,
}: HeaderProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const isTransparent = variant === 'transparent';
  const isElevated = variant === 'elevated';

  const handleLeftPress = () => {
    if (onBack) {
      onBack();
    } else if (onLeftPress) {
      onLeftPress();
    } else {
      navigation.dispatch(DrawerActions.openDrawer());
    }
  };

  const currentLeftIcon = leftIcon ?? (onBack ? 'chevron-back' : 'menu');

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + Spacing.sm },
        isTransparent && styles.transparent,
        isElevated && styles.elevated,
        style,
      ]}
    >
      <View style={styles.inner}>
        {/* ── Left side ── */}
        <View style={styles.side}>
          <TouchableOpacity
            onPress={handleLeftPress}
            style={styles.iconBtn}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <Ionicons
              name={currentLeftIcon}
              size={22}
              color={Colors.text}
            />
          </TouchableOpacity>
        </View>

        {/* ── Center ── */}
        <View style={[styles.center, !centerTitle && styles.centerLeft]}>
          {title && (
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
          )}
          {subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
          )}
        </View>

        {/* ── Right side ── */}
        <View style={[styles.side, styles.rightSide]}>
          {actions.slice(0, 3).map((action, index) => (
            <TouchableOpacity
              key={index}
              onPress={action.onPress}
              style={styles.iconBtn}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            >
              <Ionicons
                name={action.icon}
                size={22}
                color={action.color ?? Colors.text}
              />
              {action.badge !== undefined && action.badge > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {action.badge > 99 ? '99+' : action.badge}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  transparent: {
    backgroundColor: Colors.transparent,
    borderBottomWidth: 0,
  },
  elevated: {
    backgroundColor: Colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  side: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 44,
  },
  rightSide: {
    justifyContent: 'flex-end',
    gap: Spacing.xs,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
  },
  centerLeft: {
    alignItems: 'flex-start',
  },
  title: {
    color: Colors.text,
    fontSize: Typography.lg,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: Typography.xs,
    marginTop: 1,
  },
  iconBtn: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: Colors.error,
    borderRadius: Radius.full,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: Colors.white,
    fontSize: 9,
    fontWeight: '800',
  },
});
