import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Colors, Radius, Typography } from './theme';

type Props = {
  value: boolean;
  onChange: (on: boolean) => void;
  disabled?: boolean;
  style?: ViewStyle;
};

/** Majoo-style ON / OFF segmented control. */
export default function OnOffToggle({ value, onChange, disabled, style }: Props) {
  return (
    <View style={[styles.wrap, disabled && styles.wrapDisabled, style]}>
      <TouchableOpacity
        style={[styles.segment, styles.segmentLeft, value && styles.segmentOn]}
        onPress={() => !disabled && onChange(true)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityState={{ selected: value }}
      >
        <Text style={[styles.label, value && styles.labelOn]}>ON</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.segment, styles.segmentRight, !value && styles.segmentOff]}
        onPress={() => !disabled && onChange(false)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityState={{ selected: !value }}
      >
        <Text style={[styles.label, !value && styles.labelOffActive]}>OFF</Text>
      </TouchableOpacity>
    </View>
  );
}

const SEGMENT_W = 52;
const H = 34;

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceElevated,
  },
  wrapDisabled: { opacity: 0.45 },
  segment: {
    width: SEGMENT_W,
    height: H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentLeft: { borderRightWidth: 1, borderRightColor: Colors.surfaceBorder },
  segmentRight: {},
  segmentOn: { backgroundColor: Colors.success },
  segmentOff: { backgroundColor: Colors.textMuted },
  label: {
    fontSize: Typography.xs,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: Colors.textMuted,
  },
  labelOn: { color: Colors.white },
  labelOffActive: { color: Colors.white },
});
