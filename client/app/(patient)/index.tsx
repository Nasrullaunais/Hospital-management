import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/shared/context/AuthContext';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Card, Button, Badge } from '@/components/ui';
import { spacing, radius, shadows } from '@/constants/ThemeTokens';

const TAB_BAR_HEIGHT = 70;

export default function PatientDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const firstName = user?.name?.split(' ')[0] ?? 'there';

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Greeting */}
      <View style={styles.greeting}>
        <Text style={styles.greetingText}>Hello, {firstName}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Manage appointments, records, and billing from one place.
        </Text>
      </View>

      {/* Quick Actions Card */}
      <Card title="Quick Actions">
        <Button
          title="Book Appointment"
          onPress={() => router.push('/(patient)/appointments/book')}
          variant="primary"
          fullWidth
          style={styles.primaryButton}
        />
        <Button
          title="Browse Doctors"
          onPress={() => router.push('/(patient)/doctors')}
          variant="outline"
          fullWidth
        />
      </Card>

      {/* Secondary Actions Grid */}
      <View style={styles.gridRow}>
        <Card
          style={styles.tile}
          onPress={() => router.push('/(patient)/records')}
        >
          <View style={styles.tileHeader}>
            <Badge label="Records" variant="primary" />
          </View>
          <Text style={[styles.tileLabel, { color: colors.text }]}>Medical Records</Text>
          <Text style={[styles.tileSub, { color: colors.textSecondary }]}>
            View diagnosis and reports
          </Text>
        </Card>
        <Card
          style={styles.tile}
          onPress={() => router.push('/(patient)/billing')}
        >
          <View style={styles.tileHeader}>
            <Badge label="Billing" variant="info" />
          </View>
          <Text style={[styles.tileLabel, { color: colors.text }]}>Billing</Text>
          <Text style={[styles.tileSub, { color: colors.textSecondary }]}>
            Upload receipts and track payments
          </Text>
        </Card>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: { flex: 1 },
  content: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: TAB_BAR_HEIGHT + spacing.md,
  },
  greeting: { marginBottom: spacing.xs },
  greetingText: { fontSize: 28, fontWeight: '700', marginBottom: spacing.xs },
  subtitle: { fontSize: 15, lineHeight: 20 },
  primaryButton: { marginBottom: spacing.sm },
  gridRow: { flexDirection: 'row', gap: spacing.md },
  tile: {
    flex: 1,
    minHeight: 110,
    justifyContent: 'space-between',
  },
  tileHeader: { marginBottom: spacing.sm },
  tileLabel: { fontSize: 15, fontWeight: '600', marginBottom: spacing.xs },
  tileSub: { fontSize: 12 },
});
