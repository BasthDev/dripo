import LottieView from 'lottie-react-native';
import React, { useRef } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Colors, Radius, Shadow, Spacing, Typography } from '../ui';

export type PaymentSuccessData = {
  txId: string;
  timestamp: string;
  total: number;
  paidAmount?: number;
  change: number;
  itemsCount: number;
  method: string;
  orderNote?: string;
};

type Props = {
  data: PaymentSuccessData;
  onDone: () => void;
  doneLabel?: string;
};

function formatMethod(method: string) {
  if (method === 'CASH') return 'Cash';
  if (method === 'QRIS') return 'QRIS';
  if (method === 'CARD') return 'Card';
  return method;
}

function DetailRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, bold && styles.detailValueBold]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

export default function PaymentSuccessView({
  data,
  onDone,
  doneLabel = 'Done',
}: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const lottieRef = useRef<LottieView>(null);

  const total = Number(data.total) || 0;
  const paidAmount =
    data.paidAmount != null ? Number(data.paidAmount) : total;
  const change = Number(data.change) || 0;
  const itemsCount = Number(data.itemsCount) || 0;

  const paidAt = new Date(data.timestamp || Date.now());
  const timeStr = paidAt.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
  const dateStr = paidAt.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const cardMaxWidth = isLandscape ? Math.min(520, width * 0.55) : width - Spacing.lg * 2;
  const lottieSize = isLandscape ? 140 : 160;

  return (
    <ScrollView
      contentContainerStyle={[
        styles.scroll,
        {
          paddingTop: insets.top + Spacing.lg,
          paddingBottom: insets.bottom + Spacing.lg,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.card, { maxWidth: cardMaxWidth, width: '100%' }]}>
        <View style={styles.lottieWrap}>
          <LottieView
            ref={lottieRef}
            source={require('../../assets/lottie/Success.json')}
            autoPlay
            loop={false}
            style={{ width: lottieSize, height: lottieSize }}
          />
        </View>

        <Text style={styles.title}>Payment Successful</Text>
        <Text style={styles.subtitle}>
          Successfully paid Rp {total.toLocaleString()}
        </Text>

        <Text style={styles.sectionLabel}>DETAILS</Text>

        <View style={styles.detailsBox}>
          <DetailRow label="Transaction ID" value={`#${(data.txId || '').substring(0, 8).toUpperCase() || '--------'}`} />
          <View style={styles.divider} />
          <DetailRow label="Time" value={timeStr} />
          <View style={styles.divider} />
          <DetailRow label="Date" value={dateStr} />
          <View style={styles.divider} />
          <DetailRow label="Payment Method" value={formatMethod(data.method)} />
          <View style={styles.divider} />
          <DetailRow label="Total Items" value={`${itemsCount} items`} />
          {data.orderNote ? (
            <>
              <View style={styles.divider} />
              <DetailRow label="Order Note" value={data.orderNote} />
            </>
          ) : null}
          <View style={styles.divider} />
          <DetailRow
            label="Paid Amount"
            value={`Rp ${paidAmount.toLocaleString()}`}
          />
          <View style={styles.divider} />
          <DetailRow
            label="Total Amount"
            value={`Rp ${total.toLocaleString()}`}
            bold
          />
          {data.method === 'CASH' ? (
            <>
              <View style={styles.divider} />
              <DetailRow label="Change" value={`Rp ${change.toLocaleString()}`} />
            </>
          ) : null}
        </View>

        <Button label={doneLabel} variant="primary" fullWidth onPress={onDone} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.background,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
    gap: Spacing.md,
    ...Shadow.md,
  },
  lottieWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  title: {
    color: Colors.text,
    fontSize: Typography.xxl,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: Typography.md,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  sectionLabel: {
    alignSelf: 'stretch',
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: Spacing.xs,
  },
  detailsBox: {
    alignSelf: 'stretch',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  detailLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.sm,
    flex: 1,
  },
  detailValue: {
    color: Colors.text,
    fontSize: Typography.sm,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
  },
  detailValueBold: {
    fontSize: Typography.lg,
    fontWeight: '800',
    color: Colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.surfaceBorder,
  },
});
