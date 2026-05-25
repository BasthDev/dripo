import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import { Colors } from '../ui/theme';

export type DonutSlice = {
  value: number;
  color: string;
};

type Props = {
  data: DonutSlice[];
  size?: number;
  innerRadiusRatio?: number;
  centerLabel?: string;
  centerValue?: string;
};

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startAngle: number,
  endAngle: number
) {
  const start = polarToCartesian(cx, cy, outerR, endAngle);
  const end = polarToCartesian(cx, cy, outerR, startAngle);
  const innerStart = polarToCartesian(cx, cy, innerR, startAngle);
  const innerEnd = polarToCartesian(cx, cy, innerR, endAngle);
  const large = endAngle - startAngle <= 180 ? 0 : 1;

  return [
    `M ${start.x} ${start.y}`,
    `A ${outerR} ${outerR} 0 ${large} 0 ${end.x} ${end.y}`,
    `L ${innerStart.x} ${innerStart.y}`,
    `A ${innerR} ${innerR} 0 ${large} 1 ${innerEnd.x} ${innerEnd.y}`,
    'Z',
  ].join(' ');
}

export default function DonutChart({
  data,
  size = 180,
  innerRadiusRatio = 0.58,
  centerLabel,
  centerValue,
}: Props) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 4;
  const innerR = outerR * innerRadiusRatio;

  let angle = 0;
  const slices = data.map((slice, i) => {
    const sweep = (slice.value / total) * 360;
    const start = angle;
    const end = angle + sweep;
    angle = end;
    const path =
      sweep >= 359.99
        ? null
        : arcPath(cx, cy, outerR, innerR, start, end);
    return { path, color: slice.color, key: i };
  });

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <G>
          {slices.map(s =>
            s.path ? (
              <Path key={s.key} d={s.path} fill={s.color} />
            ) : (
              <Path
                key={s.key}
                d={`M ${cx} ${cy - outerR} A ${outerR} ${outerR} 0 1 1 ${cx - 0.01} ${cy - outerR} L ${cx} ${cy - innerR} A ${innerR} ${innerR} 0 1 0 ${cx} ${cy - innerR} Z`}
                fill={s.color}
              />
            )
          )}
        </G>
      </Svg>
      {(centerLabel || centerValue) && (
        <View style={styles.center} pointerEvents="none">
          {centerLabel ? <Text style={styles.centerLabel}>{centerLabel}</Text> : null}
          {centerValue ? <Text style={styles.centerValue}>{centerValue}</Text> : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: { color: Colors.textMuted, fontSize: 10, fontWeight: '600' },
  centerValue: { color: Colors.text, fontSize: 15, fontWeight: '800' },
});
