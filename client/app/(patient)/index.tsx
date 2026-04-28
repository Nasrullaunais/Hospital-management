import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/shared/context/AuthContext';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Card, Button } from '@/components/ui';
import { spacing, radius, shadows } from '@/constants/ThemeTokens';

export default function PatientDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const firstName = user?.name?.split(' ')[0] ?? 'there';

  interface NavTileProps {
    title: string;
    icon: keyof typeof Feather.glyphMap;
    bg: string;
    onPress: () => void;
  }

  function NavTile({ title, icon, bg, onPress }: NavTileProps) {
    return (
      <TouchableOpacity
        style={[styles.tile, { backgroundColor: bg }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={[styles.tileIconWrap, { backgroundColor: colors.surface }]}>
          <Feather name={icon} size={22} color={colors.primary} />
        </View>
        <Text style={[styles.tileTitle, { color: colors.text }]}>{title}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ===== Personalized Greeting ===== */}
        <View style={styles.greeting}>
          <Text style={[styles.greetingText, { color: colors.text }]}>
            Welcome, {firstName}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Your health journey, thoughtfully managed. Here's your overview for today.
          </Text>
        </View>

        {/* ===== Quick Actions ===== */}
        <Card
          title="Quick Actions"
          style={styles.quickActionsCard}
        >
          <Button
            title="Book Appointment"
            onPress={() => router.push('/(patient)/appointments/book')}
            variant="accent"
            size="lg"
            fullWidth
            icon="calendar"
            style={styles.accentButton}
          />
          <Button
            title="Browse Doctors"
            onPress={() => router.push('/(patient)/doctors')}
            variant="primary"
            size="md"
            fullWidth
            style={styles.navButton}
          />
          <Button
            title="My Bills"
            onPress={() => router.push('/(patient)/billing')}
            variant="outline"
            size="md"
            fullWidth
            style={styles.navButton}
          />
        </Card>

        {/* ===== Health Overview Grid ===== */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          Health Overview
        </Text>
        <View style={styles.grid}>
          <View style={styles.gridRow}>
            <NavTile
              title="My Records"
              icon="file-text"
              bg={colors.primaryMuted}
              onPress={() => router.push('/(patient)/records')}
            />
            <NavTile
              title="Prescriptions"
              icon="clipboard"
              bg={colors.infoBg}
              onPress={() => router.push('/(patient)/prescriptions')}
            />
          </View>
          <View style={styles.gridRow}>
            <NavTile
              title="Departments"
              icon="grid"
              bg={colors.primaryMuted}
              onPress={() => router.push('/(patient)/departments')}
            />
            <NavTile
              title="Wards"
              icon="home"
              bg={colors.infoBg}
              onPress={() => router.push('/(patient)/wards')}
            />
          </View>
        </View>

        {/* ===== Bottom CTA ===== */}
        <Button
          title="Book Appointment"
          onPress={() => router.push('/(patient)/appointments/book')}
          variant="accent"
          size="lg"
          fullWidth
          icon="calendar"
          style={styles.bottomCTA}
        />
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
    paddingBottom: spacing.xxl,
  },

  // Greeting
  greeting: {
    marginBottom: spacing.xs,
    paddingTop: spacing.md,
  },
  greetingText: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },

  // Quick Actions
  quickActionsCard: {
    marginTop: spacing.xs,
  },
  accentButton: {
    marginBottom: spacing.sm,
  },
  navButton: {
    marginBottom: spacing.sm,
  },

  // Section Label
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: spacing.xs,
  },

  // Health Overview Grid
  grid: {
    gap: spacing.md,
  },
  gridRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  tile: {
    flex: 1,
    minHeight: 110,
    borderRadius: radius.md,
    padding: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    ...shadows.card,
  },
  tileIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tileTitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Bottom CTA
  bottomCTA: {
    marginTop: spacing.sm,
  },
});
