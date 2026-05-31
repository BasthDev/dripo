import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button, Colors, Header, InputField, Radius, Spacing, Typography } from '../components/ui';
import { ActivationApiError } from '../services/deviceActivationApi';
import { isActivationApiConfigured } from '../services/deviceActivationApi';
import { useActivationStore } from '../store/useActivationStore';

export default function ActivationScreen() {
  const router = useRouter();
  const requestOtp = useActivationStore(s => s.requestOtp);
  const verifyOtp = useActivationStore(s => s.verifyOtp);

  const [outletId, setOutletId] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);

  const apiConfigured = isActivationApiConfigured();

  const handleRequestOtp = async () => {
    if (!outletId.trim()) {
      setError('Enter your outlet / store code first.');
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    setDevOtpHint(null);
    try {
      const res = await requestOtp(outletId);
      setMessage(
        apiConfigured
          ? 'OTP sent. Check SMS or your admin panel.'
          : 'Development mode: use OTP below.'
      );
      if (res.devOtp) setDevOtpHint(res.devOtp);
    } catch (e: any) {
      setError(e.message ?? 'Could not request OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async () => {
    if (!outletId.trim() || !otp.trim()) {
      setError('Outlet code and OTP are required.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await verifyOtp(outletId, otp);
      router.replace('/(drawer)');
    } catch (e) {
      if (e instanceof ActivationApiError) {
        if (e.code === 'DEVICE_IN_USE') {
          setError(
            e.activeDeviceName
              ? `This outlet is active on "${e.activeDeviceName}". Sign out there or request a new OTP.`
              : 'This outlet is already active on another device. Sign out there first.'
          );
        } else {
          setError(e.message);
        }
      } else {
        setError((e as Error).message ?? 'Activation failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Activate device" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.lead}>
            Only one tablet or phone can run this outlet at a time. Enter your outlet code and OTP
            to take over this device.
          </Text>

          {!apiConfigured ? (
            <View style={styles.devBanner}>
              <Text style={styles.devBannerText}>
                No activation server configured. Dev OTP:{' '}
                <Text style={styles.devCode}>123456</Text>
              </Text>
            </View>
          ) : null}

          <InputField
            label="Outlet / store code"
            placeholder="e.g. DRIPO-01"
            value={outletId}
            onChangeText={v => {
              setOutletId(v.toUpperCase());
              setError(null);
            }}
            autoCapitalize="characters"
          />

          <Button
            label="Send OTP"
            variant="outline"
            onPress={handleRequestOtp}
            disabled={loading}
            iconLeft="mail-outline"
          />

          <InputField
            label="OTP code"
            placeholder="6 digits"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={8}
          />

          {devOtpHint ? (
            <Text style={styles.hint}>Dev OTP: {devOtpHint}</Text>
          ) : null}
          {message ? <Text style={styles.ok}>{message}</Text> : null}
          {error ? <Text style={styles.err}>{error}</Text> : null}

          {loading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.md }} />
          ) : (
            <Button
              label="Activate this device"
              variant="primary"
              iconLeft="shield-checkmark-outline"
              onPress={handleActivate}
              style={{ marginTop: Spacing.md }}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 40 },
  lead: { color: Colors.textSecondary, fontSize: Typography.sm, lineHeight: 22 },
  devBanner: {
    padding: Spacing.md,
    backgroundColor: Colors.warning + '18',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.warning + '40',
  },
  devBannerText: { color: Colors.text, fontSize: Typography.sm },
  devCode: { fontWeight: '800', fontFamily: 'monospace' },
  hint: { color: Colors.primary, fontWeight: '700', fontSize: Typography.sm },
  ok: { color: Colors.success, fontSize: Typography.sm },
  err: { color: Colors.error, fontSize: Typography.sm, lineHeight: 20 },
});
