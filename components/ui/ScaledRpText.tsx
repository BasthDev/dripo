import React, { useMemo } from 'react';
import { StyleSheet, Text, TextStyle } from 'react-native';
import { formatRp, rupiahFontSize } from '../../utils/formatCurrency';

type Props = {
  amount: number;
  baseFontSize?: number;
  color?: string;
  style?: TextStyle;
  numberOfLines?: number;
};

/** Rupiah amount that scales down when the value is long. */
export default function ScaledRpText({
  amount,
  baseFontSize,
  color = '#FFF',
  style,
  numberOfLines = 1,
}: Props) {
  const fontSize = useMemo(
    () => rupiahFontSize(amount, baseFontSize),
    [amount, baseFontSize]
  );

  return (
    <Text
      style={[styles.value, { fontSize, color }, style]}
      numberOfLines={numberOfLines}
      adjustsFontSizeToFit
      minimumFontScale={0.65}
    >
      {formatRp(amount)}
    </Text>
  );
}

const styles = StyleSheet.create({
  value: {
    fontWeight: '800',
  },
});
