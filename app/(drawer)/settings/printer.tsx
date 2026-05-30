import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors, Header, Popup, Radius, Spacing, Typography } from '../../../components/ui';
import { BluetoothPrinter, usePosStore } from '../../../store/usePosStore';
import {
  BluetoothScanResult,
  connectDevice,
  disconnectDevice,
  isNativePrinterSupported,
  printReceipt,
  scanBluetoothDevices,
} from '../../../utils/bluetoothPrinter';

const BT_SCAN_HINT = 'Make sure Bluetooth & GPS/Location is active/On';

export default function PrinterSettingsScreen() {
  const router = useRouter();
  const { connectedPrinter, setConnectedPrinter, storeSettings } = usePosStore();

  const [isScanning, setIsScanning] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<BluetoothScanResult[]>([]);
  const [connectingAddress, setConnectingAddress] = useState<string | null>(null);
  const [printModalVisible, setPrintModalVisible] = useState(false);
  const [errorPopup, setErrorPopup] = useState<{ title: string; message: string } | null>(null);

  const showPrinterError = (title: string, message: string) => {
    setErrorPopup({ title, message });
  };

  // Animations
  const scanRadarAnim = useRef(new Animated.Value(0)).current;
  const receiptHeightAnim = useRef(new Animated.Value(0)).current;

  // Pulse animation for scanner
  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    if (isScanning) {
      scanRadarAnim.setValue(0);
      animation = Animated.loop(
        Animated.timing(scanRadarAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        })
      );
      animation.start();
    } else {
      scanRadarAnim.setValue(0);
    }
    return () => {
      if (animation) animation.stop();
    };
  }, [isScanning]);

  const handleStartScan = async () => {
    setIsScanning(true);
    setDiscoveredDevices([]);
    try {
      const result = await scanBluetoothDevices();
      setDiscoveredDevices([...result.paired, ...result.found]);
      if (isNativePrinterSupported() && result.found.length === 0 && result.paired.length === 0) {
        showPrinterError(
          'No Devices Found',
          'Make sure the printer is on and paired in Android Bluetooth settings, then scan again.'
        );
      }
    } catch (err: any) {
      console.error('Scan error:', err);
      showPrinterError('Scan Failed', err.message || 'Error occurred while scanning for devices.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleConnect = async (device: BluetoothScanResult) => {
    setConnectingAddress(device.address);
    try {
      const success = await connectDevice(device.address);
      if (success) {
        const printer: BluetoothPrinter = {
          name: device.name,
          address: device.address,
          connected: true,
        };
        setConnectedPrinter(printer);
      } else {
        showPrinterError(
          'Connection Failed',
          `Could not connect to ${device.name}. Check if printer is powered on.`
        );
      }
    } catch (err: any) {
      console.error('Connect error:', err);
      showPrinterError('Connection Error', err.message || 'An error occurred.');
    } finally {
      setConnectingAddress(null);
    }
  };

  const handleDisconnect = async () => {
    if (connectedPrinter) {
      try {
        await disconnectDevice(connectedPrinter.address);
      } catch (err) {
        console.error('Disconnect error:', err);
      }
    }
    setConnectedPrinter(null);
  };

  const handleTestPrint = async () => {
    // Show visual rollout simulation receipt overlay
    setPrintModalVisible(true);
    receiptHeightAnim.setValue(0);
    
    Animated.timing(receiptHeightAnim, {
      toValue: 1,
      duration: 2000,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();

    // If real Bluetooth hardware is active, print a physical test receipt!
    const testTx = {
      id: 'TEST-' + Math.floor(Math.random() * 100000),
      timestamp: new Date().toISOString(),
      paymentMethod: 'CASH',
      totalAmount: 63000,
      cashGiven: 70000,
      change: 7000,
      items: [
        { name: 'Flat White', quantity: 1, sellPrice: 35000, status: 'COMPLETED' },
        { name: 'Almond Croissant', quantity: 1, sellPrice: 28000, status: 'COMPLETED' },
      ],
    };
    
    try {
      await printReceipt(testTx, storeSettings);
    } catch (err) {
      console.error('Test print error:', err);
    }
  };

  const getSignalStrengthIcon = (rssi: number) => {
    if (rssi >= -50) return 'cellular';
    if (rssi >= -70) return 'cellular-outline';
    return 'cellular-outline';
  };

  return (
    <View style={styles.container}>
      <Header title="Printer Settings" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Device Mode Status Badge */}
        {/* <View style={styles.badgeContainer}>
          <Text style={[styles.badgeTextMode, { color: isNativePrinterSupported() ? Colors.success : Colors.warning }]}>
            {isNativePrinterSupported() ? '🟢 Bluetooth Mode: Real Hardware' : '⚠️ Bluetooth Mode: Demo / Fallback'}
          </Text>
        </View> */}

        {/* SECTION: Connected Printer */}
        <Text style={styles.sectionTitle}>CURRENT PRINTER</Text>
        {connectedPrinter ? (
          <View style={styles.connectedCard}>
            <View style={styles.connectedHeader}>
              <View style={styles.printerIconBg}>
                <Ionicons name="print" size={28} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.printerName}>{connectedPrinter.name}</Text>
                <Text style={styles.printerAddress}>{connectedPrinter.address}</Text>
                <View style={styles.statusBadge}>
                  <View style={styles.statusDot} />
                  <Text style={styles.statusText}>Connected & Ready</Text>
                </View>
              </View>
            </View>

            <View style={styles.connectedActions}>
              <TouchableOpacity style={styles.testPrintBtn} onPress={handleTestPrint} activeOpacity={0.8}>
                <Ionicons name="receipt-outline" size={16} color={Colors.white} />
                <Text style={styles.testPrintBtnText}>Test Print</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.disconnectBtn} onPress={handleDisconnect} activeOpacity={0.8}>
                <Ionicons name="close-circle-outline" size={16} color={Colors.error} />
                <Text style={styles.disconnectBtnText}>Disconnect</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.noPrinterCard}>
            <Ionicons name="print-outline" size={42} color={Colors.textMuted} />
            <Text style={styles.noPrinterTitle}>No Printer Connected</Text>
            <Text style={styles.noPrinterDesc}>
              Pair a portable thermal receipt printer (like RPP02N).
            </Text>
          </View>
        )}

        {/* SECTION: Available Devices */}
        <View style={styles.scanSectionHeader}>
          <Text style={styles.sectionTitle}>DISCOVER NEW PRINTERS</Text>
          {!isScanning && (
            <TouchableOpacity onPress={handleStartScan} style={styles.scanRefreshBtn}>
              <Ionicons name="refresh" size={16} color={Colors.primary} />
              <Text style={styles.scanRefreshText}>Scan</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.scanHint}>{BT_SCAN_HINT}</Text>

        {isScanning ? (
          <View style={styles.scanningContainer}>
            <View style={styles.radarWrapper}>
              <Animated.View
                style={[
                  styles.radarRing,
                  {
                    transform: [
                      {
                        scale: scanRadarAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 2.5],
                        }),
                      },
                    ],
                    opacity: scanRadarAnim.interpolate({
                      inputRange: [0, 0.8, 1],
                      outputRange: [0.6, 0.2, 0],
                    }),
                  },
                ]}
              />
              <View style={styles.radarCenter}>
                <Ionicons name="bluetooth" size={32} color={Colors.white} />
              </View>
            </View>
            <Text style={styles.scanningText}>Searching for Bluetooth devices...</Text>
            <ActivityIndicator size="small" color={Colors.primary} style={{ marginTop: Spacing.md }} />
          </View>
        ) : discoveredDevices.length > 0 ? (
          <View style={styles.deviceList}>
            {discoveredDevices.map((device) => {
              const isConnecting = connectingAddress === device.address;
              const isPrinter = device.type === 'PRINTER';

              return (
                <TouchableOpacity
                  key={device.address}
                  style={[styles.deviceRow, !isPrinter && styles.deviceRowOther]}
                  onPress={() => !isConnecting && handleConnect(device)}
                  disabled={isConnecting}
                  activeOpacity={0.7}
                >
                  <View style={[styles.deviceIconBox, { backgroundColor: isPrinter ? Colors.primary + '15' : Colors.surfaceElevated }]}>
                    <Ionicons
                      name={isPrinter ? 'print-outline' : 'phone-portrait-outline'}
                      size={20}
                      color={isPrinter ? Colors.primary : Colors.textMuted}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.deviceName}>{device.name}</Text>
                    <Text style={styles.deviceAddress}>{device.address}</Text>
                  </View>

                  {isConnecting ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : (
                    <View style={styles.deviceRightSide}>
                      <Ionicons
                        name={getSignalStrengthIcon(device.rssi) as any}
                        size={16}
                        color={device.rssi >= -60 ? Colors.success : Colors.textMuted}
                      />
                      <Text style={styles.deviceRssi}>{device.rssi} dBm</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <TouchableOpacity style={styles.startScanBox} onPress={handleStartScan} activeOpacity={0.85}>
            <Ionicons name="bluetooth-outline" size={36} color={Colors.primary} />
            <Text style={styles.startScanTitle}>Bluetooth Scanner</Text>
            <Text style={styles.startScanDesc}>
              Tap here to scan for nearest Bluetooth portable devices
            </Text>
          </TouchableOpacity>
        )}

      </ScrollView>

      <Popup
        visible={!!errorPopup}
        onClose={() => setErrorPopup(null)}
        icon="bluetooth-outline"
        iconColor={Colors.error}
        title={errorPopup?.title}
        description={errorPopup?.message}
        actions={[
          { label: 'OK', variant: 'primary', onPress: () => setErrorPopup(null) },
        ]}
      >
        {errorPopup ? (
          <Text style={styles.popupHint}>{BT_SCAN_HINT}</Text>
        ) : null}
      </Popup>

      {/* MODAL: Virtual Thermal Receipt Printer Simulator */}
      <Modal
        visible={printModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPrintModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.receiptContainer}>
            <View style={styles.receiptHeaderBar}>
              <Text style={styles.receiptHeaderTitle}>Simulated Thermal Receipt</Text>
              <TouchableOpacity onPress={() => setPrintModalVisible(false)} style={styles.closeModalBtn}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {/* Simulated printer head slot */}
            <View style={styles.printerHeadSlot}>
              <View style={styles.printerHeadIndicator} />
            </View>

            <ScrollView contentContainerStyle={styles.receiptScroll}>
              <Animated.View
                style={[
                  styles.receiptPaper,
                  {
                    height: receiptHeightAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 480], // receipt height
                    }),
                    opacity: receiptHeightAnim.interpolate({
                      inputRange: [0, 0.2],
                      outputRange: [0, 1],
                    }),
                  },
                ]}
              >
                {/* Receipt Header */}
                <Text style={styles.rStoreName}>{storeSettings.name}</Text>
                <Text style={styles.rAddress}>{storeSettings.address}</Text>
                <Text style={styles.rContact}>Phone: {storeSettings.phone}</Text>
                <Text style={styles.rDivider}>- - - - - - - - - - - - - - - -</Text>

                {/* Receipt Meta */}
                <View style={styles.rMetaRow}>
                  <Text style={styles.rMetaText}>Receipt: #0087</Text>
                  <Text style={styles.rMetaText}>{new Date().toLocaleDateString()}</Text>
                </View>
                <Text style={styles.rMetaText}>Printer: {connectedPrinter?.name || 'RPP02N'}</Text>
                <Text style={styles.rDivider}>- - - - - - - - - - - - - - - -</Text>

                {/* Items */}
                <View style={styles.rItemRow}>
                  <Text style={styles.rItemTextLeft}>1x Flat White</Text>
                  <Text style={styles.rItemTextRight}>Rp 35,000</Text>
                </View>
                <View style={styles.rItemRow}>
                  <Text style={styles.rItemTextLeft}>1x Almond Croissant</Text>
                  <Text style={styles.rItemTextRight}>Rp 28,000</Text>
                </View>
                <Text style={styles.rDivider}>- - - - - - - - - - - - - - - -</Text>

                {/* Totals */}
                <View style={styles.rItemRow}>
                  <Text style={styles.rTotalLabel}>SUBTOTAL</Text>
                  <Text style={styles.rTotalVal}>Rp 63,000</Text>
                </View>
                <View style={styles.rItemRow}>
                  <Text style={styles.rTotalLabel}>TAX (10%)</Text>
                  <Text style={styles.rTotalVal}>Rp 6,300</Text>
                </View>
                <View style={styles.rItemRow}>
                  <Text style={[styles.rTotalLabel, { fontWeight: '800' }]}>TOTAL</Text>
                  <Text style={[styles.rTotalVal, { fontWeight: '800' }]}>Rp 69,300</Text>
                </View>
                <Text style={styles.rDivider}>- - - - - - - - - - - - - - - -</Text>

                {/* QR placeholder & footer */}
                <View style={styles.rQrContainer}>
                  <Ionicons name="qr-code" size={60} color={Colors.black} />
                  <Text style={styles.rQrLabel}>Scan to review store</Text>
                </View>
                
                <Text style={styles.rFooter}>
                  {storeSettings.receiptFooter || 'Thank you for your visit!'}
                </Text>
                
                {/* Paper tear lines representation */}
                <View style={styles.zigZagRow}>
                  {Array.from({ length: 18 }).map((_, i) => (
                    <View key={i} style={styles.zigZagTriangle} />
                  ))}
                </View>
              </Animated.View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.md },
  sectionTitle: { color: Colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: Spacing.xs },
  
  badgeContainer: {
    backgroundColor: Colors.surface,
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  badgeTextMode: {
    fontSize: Typography.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Connected card
  connectedCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.success + '40',
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  connectedHeader: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center' },
  printerIconBg: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: Colors.primary + '12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  printerName: { color: Colors.text, fontSize: Typography.md, fontWeight: '800' },
  printerAddress: { color: Colors.textMuted, fontSize: Typography.xs, fontFamily: 'monospace' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    backgroundColor: Colors.success + '15',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.success },
  statusText: { color: Colors.success, fontSize: 10, fontWeight: '700' },

  connectedActions: { flexDirection: 'row', gap: Spacing.sm },
  testPrintBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: Radius.sm,
  },
  testPrintBtnText: { color: Colors.white, fontWeight: '700', fontSize: Typography.sm },
  disconnectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingVertical: Spacing.md,
    borderRadius: Radius.sm,
  },
  disconnectBtnText: { color: Colors.error, fontWeight: '700', fontSize: Typography.sm },

  // Disconnected placeholder
  noPrinterCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: Radius.md,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  noPrinterTitle: { color: Colors.text, fontSize: Typography.md, fontWeight: '700' },
  noPrinterDesc: { color: Colors.textSecondary, fontSize: Typography.xs, textAlign: 'center', lineHeight: 18 },

  // Scan section header
  scanSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.md },
  scanRefreshBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary + '15', paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.sm },
  scanRefreshText: { color: Colors.primary, fontSize: Typography.xs, fontWeight: '700' },
  scanHint: {
    color: Colors.textMuted,
    fontSize: Typography.xs,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: Spacing.xs,
  },
  popupHint: {
    color: Colors.warning,
    fontSize: Typography.sm,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: Spacing.sm,
  },

  // Bluetooth scanning UI
  scanningContainer: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  radarWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  radarRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  radarCenter: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanningText: { color: Colors.textSecondary, fontSize: Typography.sm, fontWeight: '600' },

  // Device list
  deviceList: { gap: Spacing.sm },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  deviceRowOther: { opacity: 0.7 },
  deviceIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceName: { color: Colors.text, fontSize: Typography.sm, fontWeight: '700' },
  deviceAddress: { color: Colors.textMuted, fontSize: 10, fontFamily: 'monospace' },
  deviceRightSide: { alignItems: 'flex-end', gap: 2 },
  deviceRssi: { color: Colors.textMuted, fontSize: 8 },

  // Initial Scan Start Box
  startScanBox: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.primaryLight,
    borderRadius: Radius.md,
    padding: Spacing.xxl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  startScanTitle: { color: Colors.primary, fontSize: Typography.md, fontWeight: '800' },
  startScanDesc: { color: Colors.textSecondary, fontSize: Typography.xs, textAlign: 'center' },

  // Receipt Modal styling
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  receiptContainer: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  receiptHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    backgroundColor: Colors.surface,
  },
  receiptHeaderTitle: { color: Colors.text, fontSize: Typography.sm, fontWeight: '800' },
  closeModalBtn: { padding: 4 },

  printerHeadSlot: {
    height: 8,
    backgroundColor: '#3E2723',
    borderBottomWidth: 2,
    borderBottomColor: '#27120D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  printerHeadIndicator: {
    width: 60,
    height: 2,
    backgroundColor: '#FF5252',
  },

  receiptScroll: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  receiptPaper: {
    width: 280,
    backgroundColor: Colors.white,
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  rStoreName: { color: '#000', fontSize: 16, fontWeight: '800', textAlign: 'center', marginTop: 10 },
  rAddress: { color: '#444', fontSize: 9, textAlign: 'center', marginTop: 4 },
  rContact: { color: '#444', fontSize: 9, textAlign: 'center' },
  rDivider: { color: '#000', fontSize: 12, textAlign: 'center', marginVertical: Spacing.sm, letterSpacing: 1 },
  rMetaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  rMetaText: { color: '#444', fontSize: 9, fontFamily: 'monospace' },
  rItemRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 3 },
  rItemTextLeft: { color: '#000', fontSize: 11, fontWeight: '600' },
  rItemTextRight: { color: '#000', fontSize: 11, fontFamily: 'monospace' },
  rTotalLabel: { color: '#000', fontSize: 11, fontWeight: '600' },
  rTotalVal: { color: '#000', fontSize: 11, fontWeight: '700', fontFamily: 'monospace' },
  
  rQrContainer: { alignItems: 'center', marginVertical: Spacing.md, gap: 4 },
  rQrLabel: { color: '#444', fontSize: 8, textTransform: 'uppercase' },

  rFooter: { color: '#000', fontSize: 11, fontWeight: '800', textAlign: 'center', marginTop: 10 },
  rFooterSub: { color: '#666', fontSize: 8, textAlign: 'center', marginTop: 2, marginBottom: 20 },

  zigZagRow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
  },
  zigZagTriangle: {
    width: 16,
    height: 8,
    backgroundColor: Colors.white,
    transform: [{ rotate: '180deg' }],
    borderLeftWidth: 8,
    borderLeftColor: 'transparent',
    borderRightWidth: 8,
    borderRightColor: 'transparent',
    borderTopWidth: 8,
    borderTopColor: Colors.surfaceElevated, // cuts out the bottom paper
  },
});
