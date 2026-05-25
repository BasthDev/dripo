import { Ionicons } from '@expo/vector-icons';
import React, { useRef } from 'react';
import {
  Animated,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ViewStyle
} from 'react-native';
import { Colors, Radius, Spacing, Typography } from './theme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  /** Icon displayed on the right side — search, close, filter, etc. */
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  rightIconColor?: string;
  containerStyle?: ViewStyle;
  autoFocus?: boolean;
  /** Fired when user presses Enter / search on keyboard */
  onSubmitEditing?: () => void;
  /** Keep keyboard open and refocus after submit (barcode / SKU scanning) */
  keepFocusOnSubmit?: boolean;
}

export default function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search...',
  rightIcon = 'search-outline',
  onRightIconPress,
  rightIconColor,
  containerStyle,
  autoFocus = false,
  onSubmitEditing,
  keepFocusOnSubmit = false,
}: SearchBarProps) {
  const inputRef = useRef<TextInput>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const borderAnim = useRef(new Animated.Value(0)).current;

  const handleSubmitEditing = () => {
    onSubmitEditing?.();
    if (keepFocusOnSubmit) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  const handleRightPress = () => {
    onRightIconPress?.();
    if (keepFocusOnSubmit) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  const handleFocus = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1.01, useNativeDriver: true, speed: 30 }),
      Animated.timing(borderAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const handleBlur = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 30 }),
      Animated.timing(borderAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.surfaceBorder, Colors.primary],
  });

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { borderColor, transform: [{ scale: scaleAnim }] },
        containerStyle,
      ]}
    >
      <Ionicons
        name="search-outline"
        size={18}
        color={Colors.textMuted}
        style={styles.searchIcon}
      />
      <TextInput
        ref={inputRef}
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        onFocus={handleFocus}
        onBlur={handleBlur}
        autoFocus={autoFocus}
        selectionColor={Colors.primary}
        returnKeyType="search"
        blurOnSubmit={!keepFocusOnSubmit}
        onSubmitEditing={handleSubmitEditing}
      />
      {rightIcon && (
        <TouchableOpacity
          onPress={handleRightPress}
          style={styles.rightIconBtn}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <Ionicons
            name={rightIcon}
            size={18}
            color={rightIconColor ?? Colors.textSecondary}
          />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.md,
    height: 48,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    color: Colors.text,
    fontSize: Typography.md,
  },
  rightIconBtn: {
    marginLeft: Spacing.sm,
    padding: Spacing.xs,
  },
});
