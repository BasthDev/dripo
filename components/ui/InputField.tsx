import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ViewStyle,
  TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Typography } from './theme';

interface InputFieldProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  iconLeft?: keyof typeof Ionicons.glyphMap;
  iconRight?: keyof typeof Ionicons.glyphMap;
  onIconRightPress?: () => void;
  error?: string;
  hint?: string;
  secureTextEntry?: boolean;
  disabled?: boolean;
  containerStyle?: ViewStyle;
}

export default function InputField({
  label,
  placeholder,
  value,
  onChangeText,
  iconLeft,
  iconRight,
  onIconRightPress,
  error,
  hint,
  secureTextEntry = false,
  disabled = false,
  containerStyle,
  ...rest
}: InputFieldProps) {
  const [focused, setFocused] = useState(false);
  const [secure, setSecure] = useState(secureTextEntry);
  const borderAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = () => {
    setFocused(true);
    Animated.timing(borderAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleBlur = () => {
    setFocused(false);
    Animated.timing(borderAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [error ? Colors.error : Colors.surfaceBorder, error ? Colors.error : Colors.primary],
  });

  const resolvedIconRight = secureTextEntry
    ? secure
      ? 'eye-off-outline'
      : 'eye-outline'
    : iconRight;

  const handleIconRightPress = () => {
    if (secureTextEntry) {
      setSecure((prev) => !prev);
    } else {
      onIconRightPress?.();
    }
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <Animated.View
        style={[
          styles.inputWrapper,
          { borderColor },
          disabled && styles.disabled,
        ]}
      >
        {iconLeft && (
          <Ionicons
            name={iconLeft}
            size={18}
            color={focused ? Colors.primary : Colors.textMuted}
            style={styles.iconLeft}
          />
        )}
        <TextInput
          style={[
            styles.input,
            iconLeft ? styles.inputWithIconLeft : null,
            resolvedIconRight ? styles.inputWithIconRight : null,
          ]}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          secureTextEntry={secure}
          editable={!disabled}
          selectionColor={Colors.primary}
          {...rest}
        />
        {resolvedIconRight && (
          <TouchableOpacity onPress={handleIconRightPress} style={styles.iconRight}>
            <Ionicons
              name={resolvedIconRight as keyof typeof Ionicons.glyphMap}
              size={18}
              color={focused ? Colors.primary : Colors.textMuted}
            />
          </TouchableOpacity>
        )}
      </Animated.View>
      {error ? (
        <View style={styles.hintRow}>
          <Ionicons name="alert-circle-outline" size={13} color={Colors.error} />
          <Text style={[styles.hint, { color: Colors.error }]}> {error}</Text>
        </View>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: Typography.sm,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.md,
    minHeight: 50,
  },
  disabled: {
    opacity: 0.5,
  },
  input: {
    flex: 1,
    color: Colors.text,
    fontSize: Typography.md,
    paddingVertical: Spacing.md,
  },
  inputWithIconLeft: {
    paddingLeft: Spacing.sm,
  },
  inputWithIconRight: {
    paddingRight: Spacing.sm,
  },
  iconLeft: {
    marginRight: 2,
  },
  iconRight: {
    padding: Spacing.xs,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hint: {
    color: Colors.textMuted,
    fontSize: Typography.xs,
  },
});
