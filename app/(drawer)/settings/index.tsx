import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, Header, Radius, Spacing, Typography } from '../../../components/ui';

export default function SettingsIndex() {
  const router = useRouter();

  const settingsItems = [
    {
      title: 'Store Profile',
      desc: 'Name, address, contact, and receipt info',
      icon: 'storefront-outline',
      color: Colors.primary,
      path: '/settings/store'
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
      path: '/settings/printer'
    }
  ];

  return (
    <View style={styles.container}>
      <Header title="Settings" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>PREFERENCES</Text>
        
        {settingsItems.map((item, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.menuCard}
            onPress={() => {
              if (item.path.startsWith('/settings/')) {
                router.push(item.path as never);
              } else {
                router.push(item.path as never);
              }
            }}
          >
            <View style={[styles.iconBox, { backgroundColor: item.color + '15' }]}>
               <Ionicons name={item.icon as any} size={24} color={item.color} />
            </View>
            <View style={styles.textContainer}>
               <Text style={styles.menuTitle}>{item.title}</Text>
               <Text style={styles.menuDesc}>{item.desc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        ))}

        <Text style={[styles.sectionLabel, { marginTop: Spacing.xl }]}>APP INFO</Text>
        <View style={styles.infoCard}>
           <Text style={styles.infoText}>Dripo POS v1.0.0 (Beta)</Text>
           <Text style={styles.infoSubText}>Made By BasthDev 👻</Text>
        </View>

        <View style={styles.infoCard}>
           <Text style={styles.infoText}>Incoming Features & Bugs/Fixes Updates</Text>
           <Text style={styles.infoSubText}>
            - Expenses screen and data
            </Text>
           <Text style={styles.infoSubText}>
           - Fixing priter error/bugs 
           </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.md },
  sectionLabel: { color: Colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: Spacing.md
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  textContainer: { flex: 1 },
  menuTitle: { color: Colors.text, fontSize: Typography.md, fontWeight: '700' },
  menuDesc: { color: Colors.textSecondary, fontSize: Typography.xs, marginTop: 2 },
  infoCard: { alignItems: 'center', padding: Spacing.xl },
  infoText: { color: Colors.text, fontSize: Typography.sm, fontWeight: '700' },
  infoSubText: { color: Colors.textMuted, fontSize: 10, marginTop: 4 }
});
