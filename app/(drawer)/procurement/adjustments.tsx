import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, Header, Radius, Spacing, Typography } from '../../../components/ui';

export default function AdjustmentsScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Header title="Stock adjustments" onBack={() => router.back()} />
      <View style={styles.content}>
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push('/procurement/stock-opname')}
        >
          <Ionicons name="scan-outline" size={28} color={Colors.warning} />
          <View style={styles.cardText}>
            <Text style={styles.title}>Physical count</Text>
            <Text style={styles.desc}>Same screen as receive — switch to count tab.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push('/procurement/waste')}
        >
          <Ionicons name="trash-outline" size={28} color={Colors.error} />
          <View style={styles.cardText}>
            <Text style={styles.title}>Waste / spoilage</Text>
            <Text style={styles.desc}>Record damaged or expired stock.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  cardText: { flex: 1 },
  title: { color: Colors.text, fontWeight: '700', fontSize: Typography.md },
  desc: { color: Colors.textMuted, fontSize: Typography.xs, marginTop: 4 },
});
