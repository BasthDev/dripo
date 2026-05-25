import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { Colors, Spacing } from '../ui/theme';

export type LineChartItem = {
  label: string;
  value: number;
};

type Props = {
  data: LineChartItem[];
  height?: number;
  color?: string;
  formatValue?: (v: number) => string;
  scrollable?: boolean;
  pointSpacing?: number;
};

const PAD = { left: 8, right: 8, top: 28, bottom: 4 };

export default function LineAreaChart({
  data,
  height = 220,
  color = Colors.success,
  formatValue = v => v.toLocaleString(),
  scrollable = false,
  pointSpacing = 44,
}: Props) {
  const [layoutWidth, setLayoutWidth] = useState(300);
  const plotH = height - 32;
  const innerH = plotH - PAD.top - PAD.bottom;

  const chartWidth = scrollable
    ? Math.max(data.length * pointSpacing + PAD.left + PAD.right, 320)
    : layoutWidth;

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (!scrollable && w > 0) setLayoutWidth(w);
  };

  const { linePath, areaPath, points } = useMemo(() => {
    const max = Math.max(...data.map(d => d.value), 1);
    const innerW = chartWidth - PAD.left - PAD.right;
    const step = data.length > 1 ? innerW / (data.length - 1) : 0;

    const pts = data.map((d, i) => ({
      x: PAD.left + (scrollable ? i * pointSpacing : data.length === 1 ? innerW / 2 : i * step),
      y: PAD.top + innerH - (d.value / max) * innerH,
      value: d.value,
      label: d.label,
    }));

    const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const area =
      pts.length > 0
        ? `${line} L ${pts[pts.length - 1].x} ${PAD.top + innerH} L ${pts[0].x} ${PAD.top + innerH} Z`
        : '';

    return { linePath: line, areaPath: area, points: pts };
  }, [data, chartWidth, innerH, scrollable, pointSpacing]);

  const chartInner = (
    <View style={{ width: chartWidth, height: plotH }}>
      <Svg width={chartWidth} height={plotH}>
        <Defs>
          <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.35" />
            <Stop offset="1" stopColor={color} stopOpacity="0.02" />
          </LinearGradient>
        </Defs>
        {areaPath ? <Path d={areaPath} fill="url(#areaGrad)" /> : null}
        {linePath ? (
          <Path d={linePath} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
        ) : null}
        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={4} fill={color} stroke={Colors.surface} strokeWidth={2} />
        ))}
      </Svg>
      {points.map((p, i) =>
        p.value > 0 ? (
          <Text
            key={`val-${i}`}
            style={[styles.pointValue, { left: p.x - 22, top: p.y - 20, width: 44 }]}
            numberOfLines={1}
          >
            {formatValue(p.value)}
          </Text>
        ) : null
      )}
      <View style={[styles.labelsRow, { width: chartWidth, height: 16 }]}>
        {points.map((p, i) => (
          <Text
            key={`lbl-${i}`}
            style={[
              styles.label,
              scrollable
                ? { position: 'absolute', left: p.x - 18, width: 36 }
                : { flex: 1 },
            ]}
            numberOfLines={1}
          >
            {p.label}
          </Text>
        ))}
      </View>
    </View>
  );

  return (
    <View style={{ height }} onLayout={onLayout}>
      {scrollable ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {chartInner}
        </ScrollView>
      ) : (
        chartInner
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pointValue: {
    position: 'absolute',
    color: Colors.textMuted,
    fontSize: 8,
    fontWeight: '700',
    textAlign: 'center',
  },
  labelsRow: {
    position: 'relative',
    flexDirection: 'row',
    marginTop: Spacing.xs,
  },
  label: {
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
  },
});
