import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Header, InputField, Button, Colors, Spacing, Radius, Typography } from '../../../components/ui';
import { usePosStore } from '../../../store/usePosStore';
import { Ionicons } from '@expo/vector-icons';

export default function StoreSettingsScreen() {
  const router = useRouter();
  const { storeSettings, updateStoreSettings } = usePosStore();

  const [form, setForm] = useState(storeSettings);

  const handleSave = () => {
    updateStoreSettings(form);
    router.back();
  };

  return (
    <View style={styles.container}>
      <Header title="Store Profile" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        
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
  sectionTitle: { color: Colors.text, fontSize: Typography.md, fontWeight: '800', marginBottom: 4 },
  qrPreviewBox: { 
    backgroundColor: Colors.surface, 
    borderRadius: Radius.md, 
    borderWidth: 1, 
    borderColor: Colors.surfaceBorder,
    padding: Spacing.xl,
    alignItems: 'center'
  },
  qrPlaceholder: { alignItems: 'center' },
  qrLabel: { color: Colors.textMuted, fontSize: 10, marginTop: Spacing.md },
  saveBtn: { marginTop: Spacing.lg }
});
