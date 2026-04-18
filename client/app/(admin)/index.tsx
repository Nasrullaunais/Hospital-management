import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Card, Button, Badge } from '@/components/ui';
import { spacing } from '@/constants/ThemeTokens';

const TAB_BAR_HEIGHT = 70;

export default function AdminDashboard() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: colors.text }]}>Admin Dashboard</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Control users, finance operations, and inventory governance.
      </Text>

      <View style={styles.gridRow}>
        <Card
          style={styles.tile}
          onPress={() => router.push('/(admin)/doctors/add')}
        >
          <Badge label="New" variant="success" />
          <Text style={[styles.tileLabel, { color: colors.text }]}>Add Doctor</Text>
          <Text style={[styles.tileSub, { color: colors.textSecondary }]}>
            Create a new doctor profile
          </Text>
        </Card>
        <Card
          style={styles.tile}
          onPress={() => router.push('/(admin)/billing')}
        >
          <Badge label="Queue" variant="warning" />
          <Text style={[styles.tileLabel, { color: colors.text }]}>Finance Queue</Text>
          <Text style={[styles.tileSub, { color: colors.textSecondary }]}>
            Verify pending invoice payments
          </Text>
        </Card>
      </View>

      <Card title="Operations">
        <Button
          title="Manage Doctor Directory"
          onPress={() => router.push('/(admin)/doctors')}
          variant="primary"
          fullWidth
          style={styles.button}
        />
        <Button
          title="Review Inventory Actions"
          onPress={() => router.push('/(admin)/pharmacy')}
          variant="outline"
          fullWidth
        />
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
  gridRow: { flexDirection: 'row', gap: spacing.md },
  tile: {
    flex: 1,
    minHeight: 110,
    justifyContent: 'space-between',
  },
  tileLabel: { fontSize: 15, fontWeight: '700', marginTop: spacing.sm },
  tileSub: { fontSize: 12 },
  button: { marginBottom: spacing.sm },
});
