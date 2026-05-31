import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../ui';

export type ReceiptPreviewMode = 'kitchen' | 'payment';

type Props = {
  visible: boolean;
  onClose: () => void;
  printerName: string;
  mode: ReceiptPreviewMode;
  storeName: string;
  storeAddress?: string;
  storePhone?: string;
};

export default function ReceiptPrintPreviewModal({
  visible,
  onClose,
  printerName,
  mode,
  storeName,
  storeAddress,
  storePhone,
}: Props) {
  const receiptHeightAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      receiptHeightAnim.setValue(0);
      return;
    }
    receiptHeightAnim.setValue(0);
    Animated.timing(receiptHeightAnim, {
      toValue: 1,
      duration: mode === 'payment' ? 2200 : 1400,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
  }, [visible, mode, receiptHeightAnim]);

  const height = receiptHeightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, mode === 'payment' ? 420 : 280],
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle}>
              {printerName} — {mode === 'payment' ? 'receipt' : 'order slip'}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.slot}>
            <View style={styles.slotBar} />
          </View>

          <ScrollView contentContainerStyle={styles.scroll}>
            <Animated.View style={[styles.paper, { height }]}>
              {mode === 'payment' ? (
                <>
                  <Text style={styles.storeName}>{storeName}</Text>
                  {storeAddress ? <Text style={styles.meta}>{storeAddress}</Text> : null}
                  {storePhone ? <Text style={styles.meta}>Tel: {storePhone}</Text> : null}
                  <Text style={styles.divider}>- - - - - - - - - - - - - -</Text>
                  <Text style={styles.meta}>Table: 5 · Hall</Text>
                  <Text style={styles.meta}>Order: TO-0001</Text>
                  <Text style={styles.divider}>- - - - - - - - - - - - - -</Text>
                  <View style={styles.lineRow}>
                    <Text style={styles.lineLeft}>1x Latte</Text>
                    <Text style={styles.lineRight}>Rp 35,000</Text>
                  </View>
                  <View style={styles.lineRow}>
                    <Text style={styles.lineLeft}>1x Croissant</Text>
                    <Text style={styles.lineRight}>Rp 28,000</Text>
                  </View>
                  <Text style={styles.divider}>- - - - - - - - - - - - - -</Text>
                  <View style={styles.lineRow}>
                    <Text style={styles.bold}>TOTAL</Text>
                    <Text style={styles.bold}>Rp 63,000</Text>
                  </View>
                  <Text style={styles.footer}>Thank you!</Text>
                </>
              ) : (
                <>
                  <Text style={styles.tableBig}>TABLE 5 · Hall</Text>
                  <Text style={styles.divider}>- - - - - - - - - - - - - -</Text>
                  <Text style={styles.meta}>Order: TO-0001</Text>
                  <Text style={styles.meta}>{new Date().toLocaleString()}</Text>
                  <Text style={styles.divider}>- - - - - - - - - - - - - -</Text>
                  <Text style={styles.itemBig}>2x Latte</Text>
                  <Text style={styles.subItem}>   + Oat milk</Text>
                  <Text style={styles.itemBig}>1x Burger</Text>
                </>
              )}
            </Animated.View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  sheet: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    maxHeight: '85%',
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    backgroundColor: Colors.surface,
  },
  sheetTitle: { color: Colors.text, fontWeight: '800', fontSize: Typography.sm },
  slot: {
    height: 8,
    backgroundColor: '#3E2723',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotBar: { width: 56, height: 2, backgroundColor: '#FF5252' },
  scroll: { alignItems: 'center', paddingVertical: Spacing.xl },
  paper: {
    width: 260,
    backgroundColor: Colors.white,
    padding: Spacing.md,
    overflow: 'hidden',
  },
  storeName: {
    color: '#000',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 8,
  },
  tableBig: {
    color: '#000',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 12,
  },
  meta: { color: '#444', fontSize: 9, textAlign: 'center' },
  divider: { color: '#000', fontSize: 11, textAlign: 'center', marginVertical: 8 },
  lineRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 3 },
  lineLeft: { color: '#000', fontSize: 11, fontWeight: '600' },
  lineRight: { color: '#000', fontSize: 11, fontFamily: 'monospace' },
  bold: { color: '#000', fontSize: 11, fontWeight: '800' },
  itemBig: { color: '#000', fontSize: 14, fontWeight: '800', marginTop: 6 },
  subItem: { color: '#000', fontSize: 10, marginLeft: 4 },
  footer: {
    color: '#000',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 12,
  },
});
