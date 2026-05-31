import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button, Colors, Header, Radius, Spacing, Typography } from '../../../components/ui';
import { useAppPopup } from '../../../hooks/useAppPopup';
import { useCartStore } from '../../../store/useCartStore';
import { usePosStore } from '../../../store/usePosStore';

export default function SettingsIndex() {
  const router = useRouter();
  const { showConfirm, showMessage, AppPopup } = useAppPopup();
  const resetAllData = usePosStore(s => s.resetAllData);
  const [wiping, setWiping] = useState(false);

  const settingsItems = [
    {
      title: 'Store Profile',
      desc: 'Name, address, contact, and receipt info',
      icon: 'storefront-outline',
      color: Colors.primary,
      path: '/settings/store',
    },
    {
      title: 'Product Modifiers',
      desc: 'Extra shot, add-ons — price & ingredient changes',
      icon: 'options-outline',
      color: Colors.secondary,
      path: '/modifiers',
    },
    {
      title: 'Printer Settings',
      desc: 'Connect and configure thermal printers',
      icon: 'print-outline',
      color: '#00B894',
      path: '/settings/printer',
    },
  ];

  const runWipe = async () => {
    setWiping(true);
    try {
      await resetAllData();
      useCartStore.getState().clearCart();
      showMessage({ title: 'Done', description: 'All app data has been cleared.' });
    } catch {
      showMessage({
        title: 'Error',
        description: 'Could not clear data. Try again.',
        icon: 'alert-circle-outline',
        iconColor: Colors.error,
      });
    } finally {
      setWiping(false);
    }
  };

  const confirmWipe = () => {
    showConfirm({
      title: 'Wipe all data?',
      description:
        'This permanently deletes products, inventory, sales, purchases, suppliers, and expenses on this device. Store settings reset to defaults. This cannot be undone.',
      confirmLabel: 'Continue',
      destructive: true,
      onConfirm: () => {
        showConfirm({
          title: 'Are you sure?',
          description: 'Tap Wipe now to permanently delete everything.',
          confirmLabel: 'Wipe now',
          destructive: true,
          onConfirm: runWipe,
        });
      },
    });
  };

  return (
    <View style={styles.container}>
      <Header title="Settings" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>PREFERENCES</Text>

        {settingsItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.item}
            onPress={() => router.push(item.path as never)}
          >
            <View style={[styles.iconBox, { backgroundColor: item.color + '18' }]}>
              <Ionicons name={item.icon as any} size={22} color={item.color} />
            </View>
            <View style={styles.itemText}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemDesc}>{item.desc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        ))}

        <Text style={[styles.sectionLabel, { marginTop: Spacing.xl }]}>DANGER ZONE</Text>
        <View style={styles.dangerBox}>
          <Text style={styles.dangerTitle}>Wipe all data</Text>
          <Text style={styles.dangerDesc}>
            Removes all local data from this device. Use before uninstalling or resetting the app.
          </Text>
          <Button
            label={wiping ? 'Wiping…' : 'Wipe all data'}
            variant="danger"
            iconLeft="trash-outline"
            onPress={confirmWipe}
            disabled={wiping}
            loading={wiping}
          />
        </View>
      </ScrollView>
      <AppPopup />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
  sectionLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: Spacing.sm,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: { flex: 1 },
  itemTitle: { color: Colors.text, fontWeight: '700', fontSize: Typography.md },
  itemDesc: { color: Colors.textMuted, fontSize: Typography.sm, marginTop: 2 },
  dangerBox: {
    padding: Spacing.lg,
    backgroundColor: Colors.error + '10',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.error + '30',
    gap: Spacing.sm,
  },
  dangerTitle: { color: Colors.error, fontWeight: '700', fontSize: Typography.md },
  dangerDesc: { color: Colors.textSecondary, fontSize: Typography.sm, lineHeight: 20 },
});
