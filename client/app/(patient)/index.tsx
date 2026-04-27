import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/shared/context/AuthContext';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Card, Button, Badge } from '@/components/ui';
import { spacing, radius, shadows } from '@/constants/ThemeTokens';
import { TAB_BAR_HEIGHT } from '@/shared/constants/Config';

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
          style={styles.primaryButton}
        />
        <Button
          title="Billing & Invoices"
          onPress={() => router.push('/(patient)/billing')}
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
          onPress={() => router.push('/(patient)/prescriptions')}
        >
          <View style={styles.tileHeader}>
            <Badge label="Rx" variant="info" />
          </View>
          <Text style={[styles.tileLabel, { color: colors.text }]}>Prescriptions</Text>
          <Text style={[styles.tileSub, { color: colors.textSecondary }]}>
            View your prescriptions
          </Text>
        </Card>
      </View>

      <View style={styles.gridRow}>
        <Card
          style={styles.tile}
          onPress={() => router.push('/(patient)/departments')}
        >
          <View style={styles.tileHeader}>
            <Badge label="Hospital" variant="primary" />
          </View>
          <Text style={[styles.tileLabel, { color: colors.text }]}>Departments</Text>
          <Text style={[styles.tileSub, { color: colors.textSecondary }]}>
            Browse hospital departments
          </Text>
        </Card>
        <Card
          style={styles.tile}
          onPress={() => router.push('/(patient)/wards')}
        >
          <View style={styles.tileHeader}>
            <Badge label="Rooms" variant="info" />
          </View>
          <Text style={[styles.tileLabel, { color: colors.text }]}>Wards</Text>
          <Text style={[styles.tileSub, { color: colors.textSecondary }]}>
            View ward availability
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
