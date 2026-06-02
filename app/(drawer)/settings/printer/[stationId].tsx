import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import PrinterCategoryPicker from '../../../../components/printers/PrinterCategoryPicker';
import ReceiptPrintPreviewModal, {
  type ReceiptPreviewMode,
} from '../../../../components/printers/ReceiptPrintPreviewModal';
import PrinterOptionRow from '../../../../components/printers/PrinterOptionRow';
import { Colors, Header, OnOffToggle, Popup, Radius, Spacing, Typography } from '../../../../components/ui';
import {
  PRINTER_STATION_IDS,
  type PrinterStation,
  type PrinterStationId,
  usePosStore,
} from '../../../../store/usePosStore';
import {
  BluetoothScanResult,
  connectDevice,
  disconnectDevice,
  printKitchenTicketOnDevice,
  printReceiptOnDevice,
  scanBluetoothDevices,
} from '../../../../utils/bluetoothPrinter';
import { enqueuePrint } from '../../../../utils/printQueue';
import {
  categoryPickerHint,
  getStationLabel,
  getStationRole,
  isCashierStation,
  stationReadyToPrint,
} from '../../../../utils/printerStation';

function getStationTestPreviewMode(station: PrinterStation): ReceiptPreviewMode {
  if (isCashierStation(station) && station.printOnPayment && !station.printOnTableChecker) {
    return 'payment';
  }
  return 'kitchen';
}

export default function PrinterStationScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const twoPanel = width >= 720 || width > height;

  const { stationId: rawId } = useLocalSearchParams<{ stationId: string }>();
  const stationId = PRINTER_STATION_IDS.includes(rawId as PrinterStationId)
    ? (rawId as PrinterStationId)
    : null;

  const categories = usePosStore(s => s.categories);
  const station = usePosStore(s => s.printerStations.find(p => p.id === stationId));
  const updatePrinterStation = usePosStore(s => s.updatePrinterStation);
  const setPrinterStationDevice = usePosStore(s => s.setPrinterStationDevice);
  const storeSettings = usePosStore(s => s.storeSettings);

  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<BluetoothScanResult[]>([]);
  const [connectingAddress, setConnectingAddress] = useState<string | null>(null);
  const [errorPopup, setErrorPopup] = useState<{ title: string; message: string } | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewMode, setPreviewMode] = useState<ReceiptPreviewMode>('kitchen');
  const [isTestPrinting, setIsTestPrinting] = useState(false);

  const runScan = useCallback(async () => {
    setIsScanning(true);
    setDevices([]);
    try {
      const result = await scanBluetoothDevices();
      setDevices([...result.paired, ...result.found]);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Could not scan.';
      setErrorPopup({ title: 'Scan failed', message });
    } finally {
      setIsScanning(false);
    }
  }, []);

  useEffect(() => {
    if (stationId && !station?.device) runScan();
  }, [stationId, station?.device, runScan]);

  if (!stationId || !station) {
    return (
      <View style={styles.container}>
        <Header title="Printer" onBack={() => router.back()} />
        <Text style={styles.missing}>Unknown printer.</Text>
      </View>
    );
  }

  const ready = stationReadyToPrint(station);
  const testPreviewMode = getStationTestPreviewMode(station);
  const stationLabel = getStationLabel(station);
  const stationRole = getStationRole(station);
  const cashier = isCashierStation(station);

  const handleConnect = async (device: BluetoothScanResult) => {
    setConnectingAddress(device.address);
    try {
      if (await connectDevice(device.address)) {
        setPrinterStationDevice(stationId, { name: device.name, address: device.address });
      } else {
        setErrorPopup({ title: 'Failed', message: `Could not connect to ${device.name}.` });
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Connection error';
      setErrorPopup({ title: 'Error', message });
    } finally {
      setConnectingAddress(null);
    }
  };

  const handleDisconnect = async () => {
    if (station.device) {
      try {
        await disconnectDevice(station.device.address);
      } catch {
        /* ignore */
      }
    }
    setPrinterStationDevice(stationId, null);
    updatePrinterStation(stationId, { enabled: false });
  };

  const setEnabled = (enabled: boolean) => {
    if (enabled && !station.device) {
      setErrorPopup({ title: 'Pair first', message: 'Connect a Bluetooth printer on the left.' });
      return;
    }
    if (enabled && !station.categoryIds.length) {
      setErrorPopup({ title: 'Categories', message: 'Select at least one product category.' });
      return;
    }
    updatePrinterStation(stationId, { enabled });
  };

  const runTestPrint = async () => {
    if (!station.device) return;
    const mode = testPreviewMode;
    setPreviewMode(mode);
    setPreviewVisible(true);
    setIsTestPrinting(true);

    const printDelay = mode === 'payment' ? 2200 : 1400;
    await new Promise(r => setTimeout(r, printDelay));

    enqueuePrint(stationLabel, async () => {
      if (mode === 'kitchen') {
        await printKitchenTicketOnDevice(
          station.device!.address,
          {
            stationLabel,
            orderId: 'test-order-id',
            tableName: '5',
            zone: 'Hall',
            timestamp: new Date().toISOString(),
            lines: [
              { name: 'Latte', quantity: 2, modifiers: ['Oat milk'] },
              { name: 'Burger', quantity: 1 },
            ],
          },
          storeSettings
        );
      } else {
        await printReceiptOnDevice(
          station.device!.address,
          {
            id: 'test-order-id',
            timestamp: new Date().toISOString(),
            paymentMethod: 'CASH',
            totalAmount: 63000,
            items: [
              { name: 'Latte', quantity: 1, sellPrice: 35000 },
              { name: 'Croissant', quantity: 1, sellPrice: 28000 },
            ],
            tableName: '5',
            zone: 'Hall',
          },
          storeSettings
        );
      }
    });

    setIsTestPrinting(false);
  };

  const scanPanel = (
    <View style={[styles.panel, twoPanel ? styles.panelLeft : styles.panelStacked]}>
      <PanelTitle icon="bluetooth-outline" title="Bluetooth" />
      {station.device ? (
        <View style={styles.paired}>
          <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
          <View style={{ flex: 1 }}>
            <Text style={styles.pairedName}>{station.device.name}</Text>
            <Text style={styles.pairedAddr}>{station.device.address}</Text>
          </View>
          <TouchableOpacity onPress={handleDisconnect}>
            <Text style={styles.unlink}>Unpair</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.scanLead}>Turn on the printer, then scan.</Text>
      )}
      <TouchableOpacity style={styles.scanBtn} onPress={runScan} disabled={isScanning}>
        {isScanning ? (
          <ActivityIndicator color={Colors.white} />
        ) : (
          <Text style={styles.scanBtnText}>
            {station.device ? 'Scan again' : 'Scan for printers'}
          </Text>
        )}
      </TouchableOpacity>
      <ScrollView style={styles.deviceList} nestedScrollEnabled keyboardShouldPersistTaps="handled">
        {devices.map(d => (
          <TouchableOpacity
            key={d.address}
            style={styles.deviceRow}
            onPress={() => !connectingAddress && handleConnect(d)}
            disabled={!!connectingAddress}
          >
            <Ionicons name="print-outline" size={18} color={Colors.primary} />
            <Text style={styles.deviceName}>{d.name}</Text>
            {connectingAddress === d.address ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Text style={styles.connect}>Connect</Text>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const configPanel = (
    <ScrollView
      style={[styles.panel, twoPanel && styles.panelRight]}
      contentContainerStyle={styles.configContent}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.stationName}>{stationLabel}</Text>
      <Text style={styles.stationRole}>
        {cashier
          ? 'Checker slip or full payment receipt — configure below'
          : 'Short order slip — items only, no prices'}
      </Text>

      <View style={styles.enableRow}>
        <Text style={styles.enableLabel}>Printer active</Text>
        <OnOffToggle value={station.enabled} onChange={setEnabled} />
      </View>

      {!ready ? (
        <Text style={styles.statusHint}>
          {!station.device
            ? 'Pair Bluetooth on the left.'
            : 'Choose categories below to enable printing.'}
        </Text>
      ) : (
        <Text style={styles.statusOk}>Ready — {stationLabel}</Text>
      )}

      <PanelTitle icon="grid-outline" title="Categories" />
      <Text style={styles.categoryHint}>{categoryPickerHint(stationRole)}</Text>
      <PrinterCategoryPicker
        categories={categories}
        selectedIds={station.categoryIds}
        onChange={ids => {
          updatePrinterStation(stationId, { categoryIds: ids });
          if (station.enabled && ids.length === 0) {
            updatePrinterStation(stationId, { enabled: false });
          }
        }}
      />

      <PanelTitle icon="options-outline" title="When to print" />
      <View style={styles.optionBox}>
        {cashier ? (
          <>
            <PrinterOptionRow
              title="Table checker slip"
              description="Minimal slip when saving to a table — verify items received (no prices)"
              value={station.printOnTableChecker}
              onChange={v => updatePrinterStation(stationId, { printOnTableChecker: v })}
            />
            <PrinterOptionRow
              title="Payment"
              description="Full receipt with logo, totals, and change at checkout"
              value={station.printOnPayment}
              onChange={v => updatePrinterStation(stationId, { printOnPayment: v })}
              isLast
            />
          </>
        ) : (
          <>
            <PrinterOptionRow
              title="Add to table"
              description="Print order slip every time items are saved to a table"
              value={station.printOnTableOrder}
              onChange={v => updatePrinterStation(stationId, { printOnTableOrder: v })}
              isLast
            />
            <View style={styles.paymentNaBox}>
              <Text style={styles.paymentNaText}>
                Payment receipts print on Cashier only.
              </Text>
            </View>
          </>
        )}
      </View>

      {station.device && ready ? (
        <TouchableOpacity
          style={styles.testBtn}
          onPress={runTestPrint}
          disabled={isTestPrinting}
        >
          {isTestPrinting ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <Ionicons name="print-outline" size={20} color={Colors.white} />
              <Text style={styles.testBtnText}>Test {stationLabel}</Text>
            </>
          )}
        </TouchableOpacity>
      ) : null}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <Header title={stationLabel} onBack={() => router.back()} />

      <View style={[styles.body, twoPanel && styles.bodyRow]}>
        {scanPanel}
        {twoPanel ? <View style={styles.divider} /> : null}
        {configPanel}
      </View>

      <ReceiptPrintPreviewModal
        visible={previewVisible}
        onClose={() => setPreviewVisible(false)}
        printerName={stationLabel}
        mode={previewMode}
        storeName={storeSettings.name}
        storeAddress={storeSettings.address}
        storePhone={storeSettings.phone}
      />

      <Popup
        visible={!!errorPopup}
        onClose={() => setErrorPopup(null)}
        title={errorPopup?.title}
        description={errorPopup?.message}
        actions={[{ label: 'OK', variant: 'primary', onPress: () => setErrorPopup(null) }]}
      />
    </View>
  );
}

function PanelTitle({
  icon,
  title,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
}) {
  return (
    <View style={styles.panelTitleRow}>
      <Ionicons name={icon} size={16} color={Colors.primary} />
      <Text style={styles.panelTitle}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  missing: { padding: Spacing.lg, color: Colors.textMuted },
  body: { flex: 1 },
  bodyRow: { flexDirection: 'row' },
  divider: {
    width: 1,
    backgroundColor: Colors.surfaceBorder,
  },
  panel: { flex: 1 },
  panelStacked: {
    padding: Spacing.lg,
    gap: Spacing.sm,
    maxHeight: 320,
  },
  panelLeft: {
    flex: 0.95,
    padding: Spacing.lg,
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  panelRight: {
    flex: 1.15,
    backgroundColor: Colors.background,
  },
  configContent: {
    padding: Spacing.lg,
    gap: Spacing.lg,
    paddingBottom: 48,
  },
  panelTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.xs },
  panelTitle: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  stationName: {
    fontSize: Typography.xxl,
    fontWeight: '800',
    color: Colors.text,
  },
  stationRole: {
    color: Colors.textSecondary,
    fontSize: Typography.sm,
    lineHeight: 20,
    marginBottom: Spacing.xs,
  },
  categoryHint: {
    color: Colors.textMuted,
    fontSize: Typography.xs,
    lineHeight: 18,
    marginBottom: Spacing.xs,
  },
  paymentNaBox: {
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
  },
  paymentNaText: {
    color: Colors.textMuted,
    fontSize: Typography.xs,
    fontStyle: 'italic',
  },
  enableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  enableLabel: { color: Colors.text, fontWeight: '700', fontSize: Typography.md },
  statusHint: { color: Colors.warning, fontSize: Typography.sm },
  statusOk: { color: Colors.success, fontWeight: '700', fontSize: Typography.sm },
  scanLead: { color: Colors.textMuted, fontSize: Typography.xs },
  paired: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.success + '40',
  },
  pairedName: { fontWeight: '700', color: Colors.text },
  pairedAddr: { fontSize: 10, color: Colors.textMuted, fontFamily: 'monospace' },
  unlink: { color: Colors.error, fontWeight: '700', fontSize: Typography.xs },
  scanBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  scanBtnText: { color: Colors.white, fontWeight: '700' },
  deviceList: { flex: 1, marginTop: Spacing.sm },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  deviceName: { flex: 1, fontWeight: '600', color: Colors.text },
  connect: { color: Colors.primary, fontWeight: '700', fontSize: Typography.sm },
  optionBox: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: Spacing.md,
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    marginTop: Spacing.sm,
  },
  testBtnText: { color: Colors.white, fontWeight: '800', fontSize: Typography.md },
});
