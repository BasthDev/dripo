import React, { useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ViewStyle,
  StyleProp,
  ImageSourcePropType,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Typography, Shadow } from './theme';

interface GridCardProps {
  title: string;
  subtitle?: string;
  image?: ImageSourcePropType;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  badge?: string;
  badgeColor?: string;
  onPress?: () => void;
  onMorePress?: () => void;
  footerLeft?: string;
  footerRight?: string;
  style?: StyleProp<ViewStyle>;
}

export default function GridCard({
  title,
  subtitle,
  image,
  icon,
  iconColor = Colors.primary,
  badge,
  badgeColor = Colors.primary,
  onPress,
  onMorePress,
  footerLeft,
  footerRight,
  style,
}: GridCardProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () =>
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 40 }).start();
  const handlePressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40 }).start();

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ scale }] }, style]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={styles.card}
      >
        {/* ── Top: image / icon ── */}
        <View style={styles.mediaContainer}>
          {image ? (
            <Image source={image} style={styles.image} />
          ) : icon ? (
            <View style={[styles.iconBox, { backgroundColor: iconColor + '22' }]}>
              <Ionicons name={icon} size={28} color={iconColor} />
            </View>
          ) : (
            <View style={styles.iconBox}>
              <Ionicons name="image-outline" size={28} color={Colors.textMuted} />
            </View>
          )}

          {badge && (
            <View style={[styles.badgeChip, { backgroundColor: badgeColor }]}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          )}

          {onMorePress && (
            <TouchableOpacity style={styles.moreBtn} onPress={onMorePress}>
              <Ionicons name="ellipsis-horizontal" size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Body ── */}
        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle && (
            <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text>
          )}
        </View>

        {/* ── Footer ── */}
        {(footerLeft || footerRight) && (
          <View style={styles.footer}>
            {footerLeft && <Text style={styles.footerText}>{footerLeft}</Text>}
            {footerRight && (
              <Text style={[styles.footerText, { color: Colors.primary, fontWeight: '700' }]}>
                {footerRight}
              </Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  mediaContainer: {
    width: '100%',
    aspectRatio: 1.4,
    backgroundColor: Colors.surfaceElevated,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  iconBox: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceElevated,
  },
  badgeChip: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  badgeText: {
    color: Colors.white,
    fontSize: Typography.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  moreBtn: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: Colors.surface + 'CC',
    borderRadius: Radius.full,
    padding: 4,
  },
  body: {
    padding: Spacing.md,
    gap: 4,
  },
  title: {
    color: Colors.text,
    fontSize: Typography.md,
    fontWeight: '600',
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: Typography.sm,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    paddingTop: 0,
  },
  footerText: {
    color: Colors.textMuted,
    fontSize: Typography.sm,
  },
});
