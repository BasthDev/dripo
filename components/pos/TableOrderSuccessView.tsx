import LottieView from 'lottie-react-native';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { CartItem } from '../../store/useCartStore';
import type { ProductModifier } from '../../store/usePosStore';
import { Button, Colors, Radius, Spacing, splitPanel60_40, Typography } from '../ui';
import OrderCartSummary from './OrderCartSummary';

export type TableOrderSuccessInfo = {
  tableName?: string;
  tableZone?: string;
  documentNo?: string;
  orderNote?: string;
  total: number;
  timestamp: string;
};

type Props = {
  info: TableOrderSuccessInfo;
  items: CartItem[];
  modifiers: ProductModifier[];
  onDone: () => void;
  doneLabel?: string;
  onPrint?: () => void;
};

function TableMetaRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function SuccessLeftPanel({
  info,
  onDone,
  doneLabel,
  onPrint,
  compact,
}: {
  info: TableOrderSuccessInfo;
  onDone: () => void;
  doneLabel: string;
  onPrint?: () => void;
  compact?: boolean;
}) {
  const paidAt = new Date(info.timestamp || Date.now());
  const timeStr = paidAt.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
  const dateStr = paidAt.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return (
    <View style={[styles.leftPanel, compact && styles.leftPanelCompact]}>
      <ScrollView
        style={styles.leftScroll}
        contentContainerStyle={styles.leftScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <LottieView
            source={require('../../assets/lottie/Success.json')}
            autoPlay
            loop={false}
            style={{ width: compact ? 120 : 140, height: compact ? 120 : 140 }}
          />
          <Text style={styles.title}>Order Saved</Text>
          <Text style={styles.subtitle}>
            {info.tableName
              ? `Items added to ${info.tableName}`
              : 'Items saved to table'}
          </Text>
          <Text style={styles.total}>Rp {info.total.toLocaleString()}</Text>
        </View>

        <View style={styles.metaBox}>
          <TableMetaRow label="Table" value={info.tableName ?? '—'} />
          <View style={styles.metaDivider} />
          <TableMetaRow label="Area" value={info.tableZone ?? '—'} />
          <View style={styles.metaDivider} />
          <TableMetaRow label="Order No." value={info.documentNo ?? '—'} />
          <View style={styles.metaDivider} />
          <TableMetaRow label="Time" value={`${dateStr} · ${timeStr}`} />
          {info.orderNote ? (
            <>
              <View style={styles.metaDivider} />
              <TableMetaRow label="Note" value={info.orderNote} />
            </>
          ) : null}
        </View>
      </ScrollView>

      <View style={styles.leftFooter}>
        {onPrint ? (
          <Button
            label="Reprint kitchen"
            variant="outline"
            fullWidth
            iconLeft="print-outline"
            onPress={onPrint}
          />
        ) : null}
        <Button label={doneLabel} variant="primary" fullWidth onPress={onDone} />
      </View>
    </View>
  );
}

/** Table save success — split: left status, right added items (not payment UI). */
export default function TableOrderSuccessView({
  info,
  items,
  modifiers,
  onDone,
  doneLabel = 'Back to table',
  onPrint,
}: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const showSplit = width >= 600 || width > height;
  const total = info.total;

  if (showSplit) {
    return (
      <View
        style={[
          styles.splitRoot,
          {
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        <View style={styles.splitRow}>
          <View style={[styles.splitLeft, splitPanel60_40.left]}>
            <SuccessLeftPanel
              info={info}
              onDone={onDone}
              doneLabel={doneLabel}
              onPrint={onPrint}
              compact
            />
          </View>
          <View style={[styles.splitRight, splitPanel60_40.right]}>
            <OrderCartSummary
              items={items}
              modifiers={modifiers}
              total={total}
              title="Items added to table"
              style={styles.cartFill}
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.portraitRoot,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.portraitScroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <LottieView
            source={require('../../assets/lottie/Success.json')}
            autoPlay
            loop={false}
            style={{ width: 130, height: 130 }}
          />
          <Text style={styles.title}>Order Saved</Text>
          <Text style={styles.subtitle}>
            {info.tableName
              ? `Items added to ${info.tableName}`
              : 'Items saved to table'}
          </Text>
          <Text style={styles.total}>Rp {total.toLocaleString()}</Text>
        </View>

        <OrderCartSummary
          items={items}
          modifiers={modifiers}
          total={total}
          title="Items added"
        />
      </ScrollView>

      <View style={styles.portraitFooter}>
        {onPrint ? (
          <Button
            label="Reprint kitchen"
            variant="outline"
            fullWidth
            iconLeft="print-outline"
            onPress={onPrint}
          />
        ) : null}
        <Button label={doneLabel} variant="primary" fullWidth onPress={onDone} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  splitRoot: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  splitRow: {
    flex: 1,
    flexDirection: 'row',
  },
  splitLeft: {
    borderRightWidth: 1,
    borderRightColor: Colors.surfaceBorder,
  },
  splitRight: {
    backgroundColor: Colors.surface,
  },
  cartFill: {
    flex: 1,
    borderRadius: 0,
  },
  leftPanel: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  leftPanelCompact: {},
  leftScroll: { flex: 1 },
  leftScrollContent: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  leftFooter: {
    padding: Spacing.lg,
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
    backgroundColor: Colors.background,
  },
  portraitRoot: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  portraitScroll: {
    padding: Spacing.lg,
    gap: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  portraitFooter: {
    padding: Spacing.lg,
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
  },
  hero: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
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
  },
  total: {
    color: Colors.primary,
    fontSize: Typography.xl,
    fontWeight: '800',
    marginTop: Spacing.xs,
  },
  metaBox: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  metaLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.sm,
    flex: 1,
  },
  metaValue: {
    color: Colors.text,
    fontSize: Typography.sm,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
  },
  metaDivider: {
    height: 1,
    backgroundColor: Colors.surfaceBorder,
  },
});
