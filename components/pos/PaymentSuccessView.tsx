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

export type TableOrderLineSummary = {
  name: string;
  quantity: number;
  lineTotal: number;
  note?: string;
};

export type PaymentSuccessData = {
  txId: string;
  timestamp: string;
  total: number;
  paidAmount?: number;
  change: number;
  itemsCount: number;
  method: string;
  orderNote?: string;
  /** Table order save (Majoo-style) vs payment */
  mode?: 'payment' | 'tableOrder';
  tableName?: string;
  tableZone?: string;
  documentNo?: string;
  lineItems?: TableOrderLineSummary[];
};

type Props = {
  data: PaymentSuccessData;
  onDone: () => void;
  doneLabel?: string;
  onPrint?: () => void;
  printLabel?: string;
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
      <Text style={[styles.detailValue, bold && styles.detailValueBold]} numberOfLines={3}>
        {value}
      </Text>
    </View>
  );
}

function DetailsBlock({
  data,
  total,
  paidAmount,
  change,
  itemsCount,
  timeStr,
  dateStr,
}: {
  data: PaymentSuccessData;
  total: number;
  paidAmount: number;
  change: number;
  itemsCount: number;
  timeStr: string;
  dateStr: string;
}) {
  return (
    <View style={styles.detailsColumn}>
      <Text style={styles.sectionLabel}>DETAILS</Text>
      <View style={styles.detailsBox}>
        <DetailRow
          label="Transaction ID"
          value={`#${(data.txId || '').substring(0, 8).toUpperCase() || '--------'}`}
        />
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
        <DetailRow label="Paid Amount" value={`Rp ${paidAmount.toLocaleString()}`} />
        <View style={styles.divider} />
        <DetailRow label="Total Amount" value={`Rp ${total.toLocaleString()}`} bold />
        {data.method === 'CASH' ? (
          <>
            <View style={styles.divider} />
            <DetailRow label="Change" value={`Rp ${change.toLocaleString()}`} />
          </>
        ) : null}
      </View>
    </View>
  );
}

function TableOrderDetailsBlock({
  data,
  total,
  timeStr,
  dateStr,
}: {
  data: PaymentSuccessData;
  total: number;
  timeStr: string;
  dateStr: string;
}) {
  const lines = data.lineItems ?? [];

  return (
    <View style={styles.detailsColumn}>
      <Text style={styles.sectionLabel}>ITEMS ADDED TO TABLE</Text>
      <View style={styles.detailsBox}>
        <DetailRow label="Table" value={data.tableName ?? '—'} bold />
        <View style={styles.divider} />
        <DetailRow label="Area" value={data.tableZone ?? '—'} />
        <View style={styles.divider} />
        <DetailRow label="Order No." value={data.documentNo ?? '—'} />
        <View style={styles.divider} />
        <DetailRow label="Time" value={timeStr} />
        <View style={styles.divider} />
        <DetailRow label="Date" value={dateStr} />
        {data.orderNote ? (
          <>
            <View style={styles.divider} />
            <DetailRow label="Note" value={data.orderNote} />
          </>
        ) : null}
      </View>

      {lines.length > 0 ? (
        <View style={[styles.detailsBox, styles.itemsListBox]}>
          {lines.map((line, idx) => (
            <View key={`${line.name}-${idx}`}>
              {idx > 0 ? <View style={styles.divider} /> : null}
              <View style={styles.lineItemRow}>
                <View style={styles.lineItemLeft}>
                  <Text style={styles.lineItemName} numberOfLines={2}>
                    {line.quantity}× {line.name}
                  </Text>
                  {line.note ? (
                    <Text style={styles.lineItemNote} numberOfLines={2}>
                      {line.note}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.lineItemPrice}>
                  Rp {line.lineTotal.toLocaleString()}
                </Text>
              </View>
            </View>
          ))}
          <View style={styles.divider} />
          <DetailRow label="Total" value={`Rp ${total.toLocaleString()}`} bold />
        </View>
      ) : null}
    </View>
  );
}

function SuccessHero({
  total,
  lottieSize,
  onDone,
  doneLabel,
  compact,
  isTableOrder,
  tableName,
  onPrint,
  printLabel,
}: {
  total: number;
  lottieSize: number;
  onDone: () => void;
  doneLabel: string;
  compact?: boolean;
  isTableOrder?: boolean;
  tableName?: string;
  onPrint?: () => void;
  printLabel?: string;
}) {
  const lottieRef = useRef<LottieView>(null);
  const title = isTableOrder ? 'Order Saved' : 'Payment Successful';
  const subtitle = isTableOrder
    ? tableName
      ? `Items saved to ${tableName}`
      : 'Table order saved successfully'
    : `Successfully paid Rp ${total.toLocaleString()}`;

  return (
    <View style={[styles.heroColumn, compact && styles.heroColumnCompact]}>
      <View style={styles.heroTop}>
        <View style={styles.lottieWrap}>
          <LottieView
            ref={lottieRef}
            source={require('../../assets/lottie/Success.json')}
            autoPlay
            loop={false}
            style={{ width: lottieSize, height: lottieSize }}
          />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        {isTableOrder ? (
          <Text style={styles.tableOrderTotal}>Rp {total.toLocaleString()}</Text>
        ) : null}
      </View>
      <View style={styles.heroActions}>
        {onPrint ? (
          <Button
            label={printLabel ?? 'Print receipt'}
            variant="outline"
            fullWidth
            iconLeft="print-outline"
            onPress={onPrint}
          />
        ) : null}
        <Button
          label={doneLabel}
          variant="primary"
          fullWidth
          onPress={onDone}
          style={onPrint ? undefined : styles.doneBtn}
        />
      </View>
    </View>
  );
}

/** Embedded success UI for payment screen left panel (split layout). */
export function PaymentSuccessPanel({
  data,
  onDone,
  doneLabel = 'Back to POS',
  onPrint,
  printLabel,
}: Props) {
  const total = Number(data.total) || 0;
  const paidAmount = data.paidAmount != null ? Number(data.paidAmount) : total;
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

  return (
    <View style={styles.embeddedRoot}>
      <ScrollView
        style={styles.embeddedScroll}
        contentContainerStyle={styles.embeddedScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.embeddedHero}>
          <LottieView
            source={require('../../assets/lottie/Success.json')}
            autoPlay
            loop={false}
            style={{ width: 130, height: 130 }}
          />
          <Text style={styles.title}>Payment Successful</Text>
          <Text style={styles.subtitle}>
            Successfully paid Rp {total.toLocaleString()}
          </Text>
        </View>
        <DetailsBlock
          data={data}
          total={total}
          paidAmount={paidAmount}
          change={change}
          itemsCount={itemsCount}
          timeStr={timeStr}
          dateStr={dateStr}
        />
      </ScrollView>
      <View style={styles.embeddedFooter}>
        {onPrint ? (
          <Button
            label={printLabel ?? 'Print receipt'}
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

export default function PaymentSuccessView({
  data,
  onDone,
  doneLabel = 'Done',
  onPrint,
  printLabel,
}: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTableOrder = data.mode === 'tableOrder';

  const total = Number(data.total) || 0;
  const paidAmount = data.paidAmount != null ? Number(data.paidAmount) : total;
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

  const detailProps = {
    data,
    total,
    paidAmount,
    change,
    itemsCount,
    timeStr,
    dateStr,
  };

  const heroProps = {
    total,
    onDone,
    doneLabel,
    isTableOrder,
    tableName: data.tableName,
    onPrint,
    printLabel,
  };

  const detailsContent = isTableOrder ? (
    <TableOrderDetailsBlock data={data} total={total} timeStr={timeStr} dateStr={dateStr} />
  ) : (
    <DetailsBlock {...detailProps} />
  );

  if (isLandscape) {
    return (
      <View
        style={[
          styles.landscapeRoot,
          { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + Spacing.md },
        ]}
      >
        <View style={[styles.card, styles.landscapeCard]}>
          <View style={styles.landscapeRow}>
            <ScrollView
              style={styles.landscapeDetailsScroll}
              contentContainerStyle={styles.landscapeDetailsContent}
              showsVerticalScrollIndicator={false}
            >
              {detailsContent}
            </ScrollView>

            <View style={styles.verticalDivider} />

            <SuccessHero
              {...heroProps}
              lottieSize={150}
              compact
            />
          </View>
        </View>
      </View>
    );
  }

  if (isTableOrder) {
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
        <View style={[styles.card, { width: '100%' }]}>
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
            {data.tableName
              ? `Items saved to ${data.tableName}`
              : 'Table order saved successfully'}
          </Text>
          <Text style={styles.tableOrderTotal}>Rp {total.toLocaleString()}</Text>

          <View style={styles.portraitDetailsWrap}>{detailsContent}</View>

          <View style={styles.portraitDoneWrap}>
            {onPrint ? (
              <Button
                label={printLabel ?? 'Print receipt'}
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
      <View style={[styles.card, { width: '100%' }]}>
        <View style={styles.lottieWrap}>
          <LottieView
            source={require('../../assets/lottie/Success.json')}
            autoPlay
            loop={false}
            style={{ width: 160, height: 160 }}
          />
        </View>

        <Text style={styles.title}>Payment Successful</Text>
        <Text style={styles.subtitle}>
          Successfully paid Rp {total.toLocaleString()}
        </Text>

        <View style={styles.portraitDetailsWrap}>
          <DetailsBlock {...detailProps} />
        </View>

        <View style={styles.portraitDoneWrap}>
          <Button
            label={doneLabel}
            variant="primary"
            fullWidth
            onPress={onDone}
          />
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
  landscapeRoot: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    ...Shadow.md,
  },
  landscapeCard: {
    flex: 1,
    maxHeight: '100%',
    paddingVertical: Spacing.lg,
  },
  landscapeRow: {
    flex: 1,
    flexDirection: 'row',
    minHeight: 280,
  },
  landscapeDetailsScroll: {
    flex: 1,
  },
  landscapeDetailsContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingRight: Spacing.md,
  },
  verticalDivider: {
    width: 1,
    backgroundColor: Colors.surfaceBorder,
    marginHorizontal: Spacing.lg,
    alignSelf: 'stretch',
  },
  detailsColumn: {
    flex: 1,
    alignSelf: 'stretch',
  },
  heroColumn: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: Spacing.sm,
    minWidth: 200,
    maxWidth: 320,
  },
  heroColumnCompact: {
    paddingVertical: Spacing.sm,
  },
  heroTop: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: Spacing.md,
  },
  lottieWrap: {
    alignItems: 'center',
    justifyContent: 'center',
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
  heroActions: {
    alignSelf: 'stretch',
    width: '100%',
    gap: Spacing.sm,
  },
  doneBtn: {
    marginTop: Spacing.lg,
    alignSelf: 'stretch',
  },
  tableOrderTotal: {
    color: Colors.primary,
    fontSize: Typography.xl,
    fontWeight: '800',
    textAlign: 'center',
  },
  itemsListBox: {
    marginTop: Spacing.md,
  },
  lineItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  lineItemLeft: { flex: 1 },
  lineItemName: {
    color: Colors.text,
    fontSize: Typography.sm,
    fontWeight: '600',
  },
  lineItemNote: {
    color: Colors.textMuted,
    fontSize: Typography.xs,
    fontStyle: 'italic',
    marginTop: 2,
  },
  lineItemPrice: {
    color: Colors.text,
    fontSize: Typography.sm,
    fontWeight: '700',
  },
  portraitDetailsWrap: {
    width: '100%',
    marginTop: Spacing.lg,
    marginBottom: Spacing.xxxl,
  },
  portraitDoneWrap: {
    width: '100%',
    marginTop: Spacing.xxxl,
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
  embeddedRoot: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  embeddedScroll: {
    flex: 1,
  },
  embeddedScrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.lg,
  },
  embeddedHero: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  embeddedFooter: {
    padding: Spacing.lg,
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
    backgroundColor: Colors.background,
  },
});
