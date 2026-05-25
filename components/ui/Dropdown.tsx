import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  Animated,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Typography, Shadow } from './theme';

export interface DropdownOption {
  label: string;
  value: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

interface DropdownProps {
  label?: string;
  placeholder?: string;
  options: DropdownOption[];
  value?: string;
  onChange: (option: DropdownOption) => void;
  error?: string;
  disabled?: boolean;
  containerStyle?: ViewStyle;
}

export default function Dropdown({
  label,
  placeholder = 'Select an option',
  options,
  value,
  onChange,
  error,
  disabled,
  containerStyle,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const selectedOption = options.find((o) => o.value === value);

  const toggleDropdown = () => {
    if (disabled) return;
    const toValue = open ? 0 : 1;
    Animated.spring(rotateAnim, { toValue, useNativeDriver: true, speed: 30 }).start();
    setOpen((prev) => !prev);
  };

  const handleSelect = (option: DropdownOption) => {
    Animated.spring(rotateAnim, { toValue: 0, useNativeDriver: true, speed: 30 }).start();
    onChange(option);
    setOpen(false);
  };

  const arrowRotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <TouchableOpacity
        onPress={toggleDropdown}
        activeOpacity={0.8}
        style={[
          styles.trigger,
          open && styles.triggerOpen,
          error ? styles.triggerError : null,
          disabled && styles.triggerDisabled,
        ]}
      >
        <View style={styles.triggerLeft}>
          {selectedOption?.icon && (
            <Ionicons name={selectedOption.icon} size={16} color={Colors.textSecondary} style={styles.triggerIcon} />
          )}
          <Text style={selectedOption ? styles.selectedText : styles.placeholderText} numberOfLines={1}>
            {selectedOption?.label ?? placeholder}
          </Text>
        </View>
        <Animated.View style={{ transform: [{ rotate: arrowRotation }] }}>
          <Ionicons name="chevron-down" size={18} color={Colors.textSecondary} />
        </Animated.View>
      </TouchableOpacity>

      {error && (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle-outline" size={13} color={Colors.error} />
          <Text style={styles.errorText}> {error}</Text>
        </View>
      )}

      {/* ── Options list ── */}
      <Modal transparent animationType="fade" visible={open} onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setOpen(false)} />
        <View style={styles.listWrapper}>
          <View style={styles.listCard}>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              renderItem={({ item }) => {
                const isSelected = item.value === value;
                return (
                  <TouchableOpacity
                    style={[styles.option, isSelected && styles.optionSelected]}
                    onPress={() => handleSelect(item)}
                    activeOpacity={0.7}
                  >
                    {item.icon && (
                      <Ionicons
                        name={item.icon}
                        size={16}
                        color={isSelected ? Colors.primary : Colors.textSecondary}
                        style={styles.optionIcon}
                      />
                    )}
                    <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                      {item.label}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={16} color={Colors.primary} style={styles.checkmark} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
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
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    minHeight: 50,
  },
  triggerOpen: {
    borderColor: Colors.primary,
  },
  triggerError: {
    borderColor: Colors.error,
  },
  triggerDisabled: {
    opacity: 0.5,
  },
  triggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.sm,
  },
  triggerIcon: {
    marginRight: Spacing.sm,
  },
  selectedText: {
    color: Colors.text,
    fontSize: Typography.md,
    flex: 1,
  },
  placeholderText: {
    color: Colors.textMuted,
    fontSize: Typography.md,
    flex: 1,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    color: Colors.error,
    fontSize: Typography.xs,
  },
  // Modal
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  listWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  listCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    overflow: 'hidden',
    maxHeight: 360,
    ...Shadow.lg,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  optionSelected: {
    backgroundColor: Colors.primary + '18',
  },
  optionIcon: {
    marginRight: Spacing.md,
  },
  optionText: {
    color: Colors.textSecondary,
    fontSize: Typography.md,
    flex: 1,
  },
  optionTextSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  checkmark: {
    marginLeft: Spacing.sm,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.surfaceBorder,
    marginHorizontal: Spacing.lg,
  },
});
