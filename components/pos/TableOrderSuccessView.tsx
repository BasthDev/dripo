import LottieView from 'lottie-react-native';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDeviceLayout } from '../../hooks/useDeviceLayout';
import type { CartItem } from '../../store/useCartStore';
import { getCartLineUnitPrice } from '../../store/useCartStore';
import type { ProductModifier } from '../../store/usePosStore';
import { Button, Colors, Radius, Shadow, Spacing, splitPanel60_40, Typography } from '../ui';
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
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={2}>
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

function PortraitItemsBlock({
  items,
  modifiers,
}: {
  items: CartItem[];
  modifiers: ProductModifier[];
}) {
  return (
    <View style={styles.itemsBlock}>
      <Text style={styles.sectionLabel}>ITEMS SAVED</Text>
      <View style={styles.detailsBox}>
        {items.map((item, idx) => {
          const unit = getCartLineUnitPrice(item);
          const lineTotal = unit * item.quantity;
          const modNames = (item.modifierIds ?? [])
            .map(id => modifiers.find(m => m.id === id)?.name)
            .filter(Boolean);
          return (
            <View key={item.cartItemId}>
              {idx > 0 ? <View style={styles.metaDivider} /> : null}
              <View style={styles.itemLineRow}>
                <View style={styles.itemLineLeft}>
                  <Text style={styles.itemLineName}>
                    {item.quantity}× {item.product.name}
                  </Text>
                  {modNames.length ? (
                    <Text style={styles.itemLineSub}>{modNames.join(', ')}</Text>
                  ) : null}
                </View>
                <Text style={styles.itemLinePrice}>
                  Rp {lineTotal.toLocaleString()}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/** Table save success — split on tablet; card layout on phone (matches payment success). */
export default function TableOrderSuccessView({
  info,
  items,
  modifiers,
  onDone,
  doneLabel = 'Back to table',
  onPrint,
}: Props) {
  const insets = useSafeAreaInsets();
  const { isSplitLayout } = useDeviceLayout();
  const total = info.total;

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

  if (isSplitLayout) {
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
      <View style={styles.card}>
        <View style={styles.lottieWrap}>
          <LottieView
            source={require('../../assets/lottie/Success.json')}
            autoPlay
            loop={false}
            style={{ width: 160, height: 160 }}
          />
        </View>

        <Text style={styles.title}>Order Saved</Text>
        <Text style={styles.subtitle}>
          {info.tableName
            ? `Items added to ${info.tableName}`
            : 'Items saved to table'}
        </Text>
        <Text style={styles.total}>Rp {total.toLocaleString()}</Text>

        <View style={styles.portraitDetailsWrap}>
          <Text style={styles.sectionLabel}>DETAILS</Text>
          <View style={styles.detailsBox}>
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

          <PortraitItemsBlock items={items} modifiers={modifiers} />
        </View>

        <View style={styles.portraitDoneWrap}>
          {onPrint ? (
            <Button
              label="Reprint kitchen"
              variant="outline"
              fullWidth
              iconLeft="print-outline"
              onPress={onPrint}
              style={{ marginBottom: Spacing.sm }}
            />
          ) : null}
          <Button label={doneLabel} variant="primary" fullWidth onPress={onDone} />
        </View>
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
    width: '100%',
    maxWidth: 480,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    ...Shadow.md,
  },
  lottieWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
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
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  portraitDetailsWrap: {
    width: '100%',
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  portraitDoneWrap: {
    width: '100%',
    marginTop: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  sectionLabel: {
    alignSelf: 'stretch',
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  detailsBox: {
    alignSelf: 'stretch',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  metaBox: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
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
  metaDivider: {
    height: 1,
    backgroundColor: Colors.surfaceBorder,
  },
  itemsBlock: {
    alignSelf: 'stretch',
    marginTop: Spacing.sm,
  },
  itemLineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  itemLineLeft: { flex: 1 },
  itemLineName: {
    color: Colors.text,
    fontSize: Typography.sm,
    fontWeight: '600',
  },
  itemLineSub: {
    color: Colors.textMuted,
    fontSize: Typography.xs,
    marginTop: 2,
  },
  itemLinePrice: {
    color: Colors.text,
    fontSize: Typography.sm,
    fontWeight: '700',
  },
});
