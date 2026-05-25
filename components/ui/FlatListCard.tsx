import React, { useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ViewStyle,
  ImageSourcePropType,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Typography, Shadow } from './theme';

interface FlatListCardProps {
  title: string;
  subtitle?: string;
  description?: string;
  image?: ImageSourcePropType;
  badge?: string;
  badgeColor?: string;
  tag?: string;
  tagColor?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  onMorePress?: () => void;
  /** extra trailing content — e.g. a price, status chip */
  trailingValue?: string;
  trailingValueColor?: string;
  /** custom icon instead of image */
  leftIcon?: keyof typeof Ionicons.glyphMap;
  leftIconColor?: string;
  style?: ViewStyle;
}

export default function FlatListCard({
  title,
  subtitle,
  description,
  image,
  badge,
  badgeColor = Colors.primary,
  tag,
  tagColor = Colors.accent,
  onPress,
  onLongPress,
  onMorePress,
  trailingValue,
  trailingValueColor = Colors.text,
  leftIcon,
  leftIconColor = Colors.textMuted,
  style,
}: FlatListCardProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () =>
    Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, speed: 40 }).start();
  const handlePressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40 }).start();

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={styles.card}
      >
        {/* ── Left: image or icon placeholder ── */}
        {image ? (
          <Image source={image} style={styles.image} />
        ) : leftIcon ? (
          <View
            style={[
              styles.imagePlaceholder,
              leftIconColor !== Colors.textMuted && {
                backgroundColor: leftIconColor + '18',
              },
            ]}
          >
            <Ionicons name={leftIcon} size={24} color={leftIconColor} />
          </View>
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="image-outline" size={22} color={Colors.textMuted} />
          </View>
        )}

        {/* ── Middle: content ── */}
        <View style={styles.content}>
          <View style={styles.topRow}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            {badge && (
              <View style={[styles.badge, { backgroundColor: badgeColor + '22' }]}>
                <Text style={[styles.badgeText, { color: badgeColor }]}>{badge}</Text>
              </View>
            )}
          </View>
          {subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
          )}
          {description && (
            <Text style={styles.description} numberOfLines={2}>{description}</Text>
          )}
          {tag && (
            <View style={[styles.tag, { backgroundColor: tagColor + '22' }]}>
              <Text style={[styles.tagText, { color: tagColor }]}>{tag}</Text>
            </View>
          )}
        </View>

        {/* ── Right: trailing value + more button ── */}
        <View style={styles.trailing}>
          {trailingValue && (
            <Text style={[styles.trailingValue, { color: trailingValueColor }]}>
              {trailingValue}
            </Text>
          )}
          {onMorePress && (
            <TouchableOpacity onPress={onMorePress} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <Ionicons name="ellipsis-vertical" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: Spacing.md,
    ...Shadow.sm,
  },
  image: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceElevated,
  },
  imagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 3,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    color: Colors.text,
    fontSize: Typography.md,
    fontWeight: '600',
    flex: 1,
  },
  badge: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: Typography.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: Typography.sm,
  },
  description: {
    color: Colors.textMuted,
    fontSize: Typography.xs,
    lineHeight: 17,
  },
  tag: {
    alignSelf: 'flex-start',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    marginTop: 2,
  },
  tagText: {
    fontSize: Typography.xs,
    fontWeight: '500',
  },
  trailing: {
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  trailingValue: {
    fontSize: Typography.sm,
    fontWeight: '700',
  },
});
