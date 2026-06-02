import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors, Header, Radius, Spacing, Typography } from '../../../../components/ui';
import { usePosStore } from '../../../../store/usePosStore';
import {
  categorySummary,
  getStationLabel,
  isCashierStation,
  stationReadyToPrint,
} from '../../../../utils/printerStation';
import { getPrintQueuePending, subscribePrintQueue } from '../../../../utils/printQueue';

export default function PrinterListScreen() {
  const router = useRouter();
  const categories = usePosStore(s => s.categories);
  const printerStations = usePosStore(s => s.printerStations);
  const [queuePending, setQueuePending] = useState(0);

  useEffect(() => subscribePrintQueue(setQueuePending), []);

  return (
    <View style={styles.container}>
      <Header title="Printers" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Cashier, Bar & Kitchen</Text>
          <Text style={styles.heroText}>
            Pair one Bluetooth printer per station. Assign product categories so each
            item routes to the right printer. Bar and Kitchen print short order slips when
            you save a table; Cashier prints the full receipt at payment.
          </Text>
        </View>

        {(queuePending > 0 || getPrintQueuePending() > 0) && (
          <View style={styles.queueBanner}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.queueText}>Printing… {queuePending} in queue</Text>
          </View>
        )}

        {printerStations.map(station => {
          const ready = stationReadyToPrint(station);
          const label = getStationLabel(station);
          const cashier = isCashierStation(station);
          return (
            <TouchableOpacity
              key={station.id}
              style={styles.card}
              activeOpacity={0.88}
              onPress={() => router.push(`/settings/printer/${station.id}`)}
            >
              <View style={[styles.iconWrap, ready && styles.iconWrapReady]}>
                <Ionicons
                  name="print"
                  size={24}
                  color={ready ? Colors.success : Colors.textMuted}
                />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{label}</Text>
                <Text style={styles.cardSub} numberOfLines={1}>
                  {station.device?.name ?? 'Tap to pair Bluetooth'}
                </Text>
                <Text style={styles.cardMeta}>{categorySummary(station, categories)}</Text>
                <View style={styles.pills}>
                  {cashier && station.printOnTableChecker ? (
                    <Pill text="Checker" on />
                  ) : null}
                  {!cashier && station.printOnTableOrder ? (
                    <Pill text="Add to table" on />
                  ) : null}
                  {station.printOnPayment ? <Pill text="Payment" on /> : null}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={22} color={Colors.textMuted} />
            </TouchableOpacity>
          );
        })}

        <View style={styles.tipBox}>
          <Text style={styles.tipTitle}>Quick guide</Text>
          <Text style={styles.tipLine}>
            • Add to table — Bar/Kitchen order slips when saving a table
          </Text>
          <Text style={styles.tipLine}>
            • Checker — Cashier minimal slip to confirm items at the table
          </Text>
          <Text style={styles.tipLine}>
            • Payment — full receipt with totals (Cashier)
          </Text>
          <Text style={styles.tipLine}>
            • Categories — e.g. Coffee → Bar, Food → Kitchen
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Pill({ text, on }: { text: string; on: boolean }) {
  return (
    <View style={[styles.pill, on && styles.pillOn]}>
      <Text style={[styles.pillText, on && styles.pillTextOn]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 40 },
  hero: {
    padding: Spacing.lg,
    backgroundColor: Colors.primary + '10',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.primary + '25',
    gap: Spacing.xs,
  },
  heroTitle: { color: Colors.text, fontSize: Typography.md, fontWeight: '800' },
  heroText: { color: Colors.textSecondary, fontSize: Typography.sm, lineHeight: 20 },
  queueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
  },
  queueText: { color: Colors.primary, fontWeight: '600', fontSize: Typography.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapReady: { backgroundColor: Colors.success + '15' },
  cardBody: { flex: 1, gap: 4 },
  cardTitle: { color: Colors.text, fontWeight: '800', fontSize: Typography.md },
  cardSub: { color: Colors.textSecondary, fontSize: Typography.xs },
  cardMeta: { color: Colors.textMuted, fontSize: 10 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceElevated,
  },
  pillOn: { backgroundColor: Colors.success + '20' },
  pillText: { fontSize: 10, fontWeight: '700', color: Colors.textMuted },
  pillTextOn: { color: Colors.success },
  tipBox: {
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    gap: 6,
  },
  tipTitle: { fontWeight: '700', color: Colors.text, fontSize: Typography.sm },
  tipLine: { color: Colors.textMuted, fontSize: Typography.xs, lineHeight: 18 },
});
