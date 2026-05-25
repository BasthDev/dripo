import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, Spacing } from '../ui/theme';

export type BarChartItem = {
  label: string;
  value: number;
  color?: string;
};

type Props = {
  data: BarChartItem[];
  height?: number;
  formatValue?: (v: number) => string;
  /** Fixed column width + horizontal scroll (for 30d / 90d). */
  scrollable?: boolean;
  columnWidth?: number;
  columnGap?: number;
};

export default function BarChartView({
  data,
  height = 200,
  formatValue = v => v.toLocaleString(),
  scrollable = false,
  columnWidth = 40,
  columnGap = 12,
}: Props) {
  const max = Math.max(...data.map(d => d.value), 1);
  const plotHeight = height - 40;

  const renderColumn = (item: BarChartItem, i: number) => {
    const barH = Math.max((item.value / max) * plotHeight, item.value > 0 ? 4 : 2);
    return (
      <View
        key={`${item.label}-${i}`}
        style={[
          styles.col,
          scrollable && { width: columnWidth, marginRight: columnGap },
        ]}
      >
        {item.value > 0 && (
          <Text style={styles.topLabel} numberOfLines={1}>
            {formatValue(item.value)}
          </Text>
        )}
        <View
          style={[
            styles.bar,
            {
              height: barH,
              backgroundColor: item.color ?? Colors.primary,
            },
            scrollable && { width: Math.min(columnWidth - 8, 32) },
          ]}
        />
        <Text style={styles.label} numberOfLines={1}>
          {item.label}
        </Text>
      </View>
    );
  };

  if (scrollable) {
    const contentWidth = data.length * (columnWidth + columnGap) + Spacing.md;
    return (
      <View style={{ height }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { minWidth: contentWidth }]}
        >
          <View style={[styles.plotScroll, { height: plotHeight + 24 }]}>
            {data.map(renderColumn)}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ height }}>
      <View style={[styles.plot, { height: plotHeight + 24 }]}>
        {data.map(renderColumn)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: Spacing.xs,
    paddingBottom: Spacing.xs,
  },
  plot: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    paddingBottom: Spacing.xs,
    gap: 4,
  },
  plotScroll: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    paddingBottom: Spacing.xs,
  },
  col: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    minWidth: 0,
  },
  topLabel: {
    color: Colors.textMuted,
    fontSize: 8,
    fontWeight: '700',
    marginBottom: 2,
    textAlign: 'center',
  },
  bar: {
    width: '80%',
    maxWidth: 32,
    borderRadius: 4,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  label: {
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: Spacing.xs,
    width: '100%',
  },
});
