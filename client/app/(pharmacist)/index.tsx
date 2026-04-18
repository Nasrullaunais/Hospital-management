import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Card, Button, Badge } from '@/components/ui';
import { spacing } from '@/constants/ThemeTokens';

const TAB_BAR_HEIGHT = 70;

export default function PharmacistDashboard() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: colors.text }]}>Pharmacist Dashboard</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Monitor stock health and update inventory records.
      </Text>

      <Card title="Inventory Workflow">
        <Button
          title="View Inventory"
          onPress={() => router.push('/(pharmacist)/pharmacy')}
          variant="primary"
          fullWidth
          style={styles.button}
        />
        <Button
          title="Add Medication"
          onPress={() => router.push('/(pharmacist)/pharmacy/add-medicine')}
          variant="outline"
          fullWidth
        />
      </Card>

      <Card title="Dispensing">
        <Button
          title="Pending Prescriptions"
          onPress={() => router.push('/(pharmacist)/dispense')}
          variant="primary"
          fullWidth
          style={{ backgroundColor: colors.success }}
        />
      </Card>

      <Card style={{ backgroundColor: colors.infoBg, borderColor: colors.primary }}>
        <Badge label="Focus Areas" variant="info" />
        <Text style={[styles.noteText, { color: colors.text }]}>
          Track low-stock alerts daily and keep packaging images clear for quick identification.
        </Text>
      </Card>

      <Card title="Quick Stats">
        <View style={styles.alertRow}>
          <View style={styles.alertItem}>
            <Text style={[styles.alertValue, { color: colors.primary }]}>—</Text>
            <Text style={[styles.alertLabel, { color: colors.textSecondary }]}>Total Medicines</Text>
          </View>
          <View style={styles.alertItem}>
            <Text style={[styles.alertValue, { color: colors.error }]}>—</Text>
            <Text style={[styles.alertLabel, { color: colors.textSecondary }]}>Low Stock</Text>
          </View>
          <View style={styles.alertItem}>
            <Text style={[styles.alertValue, { color: colors.warning }]}>—</Text>
            <Text style={[styles.alertLabel, { color: colors.textSecondary }]}>Expiring Soon</Text>
          </View>
        </View>
      </Card>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  content: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: TAB_BAR_HEIGHT + spacing.md,
  },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 14 },
  button: { marginBottom: spacing.sm },
  noteText: { fontSize: 13, marginTop: spacing.sm },
  alertRow: { flexDirection: 'row', justifyContent: 'space-around' },
  alertItem: { alignItems: 'center' },
  alertValue: { fontSize: 22, fontWeight: '700' },
  alertLabel: { fontSize: 12, marginTop: 2 },
});
