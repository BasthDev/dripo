import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Colors, Header, Popup, Radius, Spacing, Typography } from '../../../components/ui';
import { isActivationApiConfigured } from '../../../services/deviceActivationApi';
import { useActivationStore } from '../../../store/useActivationStore';

export default function DeviceLicenseScreen() {
  const router = useRouter();
  const session = useActivationStore(s => s.session);
  const signOutDevice = useActivationStore(s => s.signOutDevice);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSignOut = async () => {
    setBusy(true);
    try {
      await signOutDevice();
      setConfirmVisible(false);
      router.replace('/activation');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Device license" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.lead}>
          This outlet license is tied to one device. Activating another tablet with OTP will sign
          this device out automatically.
        </Text>

        <View style={styles.card}>
          <Row label="Outlet" value={session?.outletId ?? '—'} />
          <Row label="Device" value={session?.deviceName ?? '—'} />
          <Row label="Device ID" value={session?.deviceId?.slice(0, 18) ?? '—'} mono />
          <Row
            label="Activated"
            value={
              session?.activatedAt
                ? new Date(session.activatedAt).toLocaleString()
                : '—'
            }
          />
          <Row
            label="Server"
            value={isActivationApiConfigured() ? 'Connected' : 'Dev (local only)'}
          />
        </View>

        <Button
          label="Sign out this device"
          variant="outline"
          iconLeft="log-out-outline"
          onPress={() => setConfirmVisible(true)}
        />
      </ScrollView>

      <Popup
        visible={confirmVisible}
        onClose={() => !busy && setConfirmVisible(false)}
        icon="log-out-outline"
        iconColor={Colors.warning}
        title="Sign out device?"
        description="Another device can activate this outlet with OTP. Unsaved work on this device stays local."
        actions={[
          {
            label: busy ? 'Signing out…' : 'Sign out',
            variant: 'primary',
            onPress: handleSignOut,
          },
          { label: 'Cancel', variant: 'ghost', onPress: () => setConfirmVisible(false) },
        ]}
      />
    </View>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, mono && styles.mono]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.lg },
  lead: { color: Colors.textSecondary, fontSize: Typography.sm, lineHeight: 20 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  row: { gap: 2 },
  rowLabel: { color: Colors.textMuted, fontSize: Typography.xs, fontWeight: '700' },
  rowValue: { color: Colors.text, fontSize: Typography.sm, fontWeight: '600' },
  mono: { fontFamily: 'monospace', fontSize: Typography.xs },
});
