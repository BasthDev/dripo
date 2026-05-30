import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Button,
  Colors,
  Header,
  InputField,
  Radius,
  Spacing,
  Typography,
} from '../../../components/ui';
import { usePosStore } from '../../../store/usePosStore';
import {
  pickAndSaveStoreLogo,
  removeStoreLogoFile,
} from '../../../utils/storeLogo';

export default function StoreSettingsScreen() {
  const router = useRouter();
  const { storeSettings, updateStoreSettings } = usePosStore();

  const [form, setForm] = useState({
    ...storeSettings,
    receiptFooter: storeSettings.receiptFooter || 'Thank you for your visit!',
  });
  const [logoUri, setLogoUri] = useState(storeSettings.logoUri);
  const [pickingLogo, setPickingLogo] = useState(false);

  const handlePickLogo = async () => {
    setPickingLogo(true);
    try {
      const uri = await pickAndSaveStoreLogo();
      if (uri) {
        setLogoUri(uri);
      }
    } finally {
      setPickingLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    Alert.alert('Remove Logo', 'Remove the receipt logo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await removeStoreLogoFile(logoUri);
          setLogoUri(undefined);
        },
      },
    ]);
  };

  const handleSave = () => {
    updateStoreSettings({ ...form, logoUri });
    router.back();
  };

  return (
    <View style={styles.container}>
      <Header title="Store Profile" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Receipt Logo</Text>
          <Text style={styles.sectionHint}>
            Shown at the top of printed receipts. Saved locally on this device.
          </Text>
          <View style={styles.logoPreviewBox}>
            {logoUri ? (
              <Image source={{ uri: logoUri }} style={styles.logoImage} contentFit="contain" />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Ionicons name="image-outline" size={48} color={Colors.textMuted} />
                <Text style={styles.logoPlaceholderText}>No logo uploaded</Text>
              </View>
            )}
          </View>
          <View style={styles.logoActions}>
            <Button
              label={logoUri ? 'Change Logo' : 'Upload Logo'}
              variant="secondary"
              iconLeft="cloud-upload-outline"
              onPress={handlePickLogo}
              loading={pickingLogo}
              style={styles.logoBtn}
            />
            {logoUri ? (
              <Button
                label="Remove"
                variant="outline"
                iconLeft="trash-outline"
                onPress={handleRemoveLogo}
                style={styles.logoBtn}
              />
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          <InputField
            label="Store Name"
            placeholder="Dripo Coffee"
            value={form.name}
            onChangeText={(text) => setForm({ ...form, name: text })}
          />
          <InputField
            label="Address"
            placeholder="Street name, City"
            value={form.address}
            onChangeText={(text) => setForm({ ...form, address: text })}
            multiline
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact & Social</Text>
          <InputField
            label="Phone Number"
            placeholder="+1..."
            value={form.phone}
            onChangeText={(text) => setForm({ ...form, phone: text })}
            keyboardType="phone-pad"
          />
          <InputField
            label="Social Media"
            placeholder="@instagram_handle"
            value={form.social}
            onChangeText={(text) => setForm({ ...form, social: text })}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Receipt Footer</Text>
          <InputField
            label="Footer Text"
            placeholder="Thank you for your visit!"
            value={form.receiptFooter}
            onChangeText={(text) => setForm({ ...form, receiptFooter: text })}
            multiline
            numberOfLines={3}
            hint="Shown at the bottom of printed receipts. Use a new line for multiple lines."
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Receipt QR Code</Text>
          <InputField
            label="QR Context (URL or Text)"
            placeholder="https://..."
            value={form.qrData}
            onChangeText={(text) => setForm({ ...form, qrData: text })}
          />
          <View style={styles.qrPreviewBox}>
            <View style={styles.qrPlaceholder}>
              <Ionicons name="qr-code-outline" size={80} color={Colors.textMuted} />
              <Text style={styles.qrLabel}>Preview will appear on receipt</Text>
            </View>
          </View>
        </View>

        <Button
          label="Save Settings"
          variant="primary"
          iconLeft="save-outline"
          onPress={handleSave}
          style={styles.saveBtn}
        />
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.xl },
  section: { gap: Spacing.md },
  sectionTitle: {
    color: Colors.text,
    fontSize: Typography.md,
    fontWeight: '800',
    marginBottom: 4,
  },
  sectionHint: {
    color: Colors.textMuted,
    fontSize: Typography.sm,
    marginTop: -Spacing.xs,
  },
  logoPreviewBox: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
  },
  logoImage: {
    width: 120,
    height: 120,
    borderRadius: Radius.md,
  },
  logoPlaceholder: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  logoPlaceholderText: {
    color: Colors.textMuted,
    fontSize: Typography.sm,
  },
  logoActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  logoBtn: { flex: 1 },
  qrPreviewBox: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  qrPlaceholder: { alignItems: 'center' },
  qrLabel: { color: Colors.textMuted, fontSize: 10, marginTop: Spacing.md },
  saveBtn: { marginTop: Spacing.lg },
});
