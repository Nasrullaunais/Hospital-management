import React from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Card, Button } from '@/components/ui';
import { spacing, radius, shadows, typography } from '@/constants/ThemeTokens';
import { TAB_BAR_HEIGHT } from '@/shared/constants/Config';
import { useAuth } from '@/shared/context/AuthContext';

export default function AdminDashboard() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { user } = useAuth();

  const adminName = user?.name ?? 'Admin';

  const navigateTo = (path: string) => () => {
    router.push(path as never);
  };

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: TAB_BAR_HEIGHT + spacing.lg },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.logoBadge, { backgroundColor: colors.accent }]}>
              <Feather name="activity" size={16} color="#FFFFFF" />
            </View>
            <View>
              <Text style={[styles.appName, { color: colors.text }]}>Pulse</Text>
              <Text style={[styles.adminLabel, { color: colors.textTertiary }]}>
                Admin Panel
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <View
              style={[styles.statusDot, { backgroundColor: colors.success }]}
            />
            <Text
              style={[styles.statusText, { color: colors.textSecondary }]}
            >
              System Online
            </Text>
          </View>
        </View>

        <View style={styles.greeting}>
          <Text style={[styles.greetingWelcome, { color: colors.textSecondary }]}>
            Welcome back,
          </Text>
          <Text style={[styles.greetingName, { color: colors.text }]}>
            {adminName}
          </Text>
        </View>

        <View style={styles.statsRow}>
          <Pressable
            onPress={navigateTo('/(admin)/users')}
            style={({ pressed }) => [
              styles.statCard,
              shadows.card,
              {
                backgroundColor: colors.surface,
                shadowColor: '#1B2A4A',
                opacity: pressed ? 0.88 : 1,
              },
            ]}
          >
            <View
              style={[
                styles.statIconWrap,
                { backgroundColor: colors.primaryMuted },
              ]}
            >
              <Feather name="users" size={18} color={colors.primary} />
            </View>
            <Text style={[styles.statNumber, { color: colors.text }]}>--</Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>
              TOTAL DOCTORS
            </Text>
          </Pressable>

          <Pressable
            onPress={navigateTo('/(admin)/billing')}
            style={({ pressed }) => [
              styles.statCard,
              shadows.card,
              {
                backgroundColor: colors.surface,
                shadowColor: '#1B2A4A',
                opacity: pressed ? 0.88 : 1,
              },
            ]}
          >
            <View
              style={[
                styles.statIconWrap,
                { backgroundColor: colors.warningBg },
              ]}
            >
              <Feather name="dollar-sign" size={18} color={colors.warning} />
            </View>
            <Text style={[styles.statNumber, { color: colors.text }]}>--</Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>
              PENDING BILLS
            </Text>
          </Pressable>

          <Pressable
            onPress={navigateTo('/(admin)/wards')}
            style={({ pressed }) => [
              styles.statCard,
              shadows.card,
              {
                backgroundColor: colors.surface,
                shadowColor: '#1B2A4A',
                opacity: pressed ? 0.88 : 1,
              },
            ]}
          >
            <View
              style={[
                styles.statIconWrap,
                { backgroundColor: colors.successBg },
              ]}
            >
              <Feather name="home" size={18} color={colors.success} />
            </View>
            <Text style={[styles.statNumber, { color: colors.text }]}>--</Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>
              ACTIVE WARDS
            </Text>
          </Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Quick Actions
          </Text>
        </View>

        <View style={styles.quickGrid}>
          <Pressable
            onPress={navigateTo('/(admin)/doctors/add')}
            style={({ pressed }) => [
              styles.actionTile,
              styles.actionAccent,
              {
                backgroundColor: colors.accent,
                opacity: pressed ? 0.88 : 1,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              },
            ]}
          >
            <Feather name="user-plus" size={26} color="#FFFFFF" />
            <Text style={styles.actionAccentTitle}>Add Doctor</Text>
            <Text style={styles.actionAccentSub}>New staff profile</Text>
          </Pressable>

          <Pressable
            onPress={navigateTo('/(admin)/pharmacy')}
            style={({ pressed }) => [
              styles.actionTile,
              styles.actionSecondary,
              shadows.card,
              {
                backgroundColor: colors.surface,
                shadowColor: '#1B2A4A',
                opacity: pressed ? 0.88 : 1,
              },
            ]}
          >
            <View
              style={[
                styles.actionIconWrap,
                { backgroundColor: colors.primaryMuted },
              ]}
            >
              <Feather name="package" size={22} color={colors.primary} />
            </View>
            <Text style={[styles.actionTitle, { color: colors.text }]}>
              Manage Pharmacy
            </Text>
            <Text style={[styles.actionSub, { color: colors.textTertiary }]}>
              Inventory control
            </Text>
          </Pressable>

          <Pressable
            onPress={navigateTo('/(admin)/billing')}
            style={({ pressed }) => [
              styles.actionTile,
              styles.actionSecondary,
              shadows.card,
              {
                backgroundColor: colors.surface,
                shadowColor: '#1B2A4A',
                opacity: pressed ? 0.88 : 1,
              },
            ]}
          >
            <View
              style={[
                styles.actionIconWrap,
                { backgroundColor: colors.primaryMuted },
              ]}
            >
              <Feather name="file-text" size={22} color={colors.primary} />
            </View>
            <Text style={[styles.actionTitle, { color: colors.text }]}>
              Create Invoice
            </Text>
            <Text style={[styles.actionSub, { color: colors.textTertiary }]}>
              Billing & payments
            </Text>
          </Pressable>

          <Pressable
            onPress={navigateTo('/(admin)/wards')}
            style={({ pressed }) => [
              styles.actionTile,
              styles.actionSecondary,
              shadows.card,
              {
                backgroundColor: colors.surface,
                shadowColor: '#1B2A4A',
                opacity: pressed ? 0.88 : 1,
              },
            ]}
          >
            <View
              style={[
                styles.actionIconWrap,
                { backgroundColor: colors.primaryMuted },
              ]}
            >
              <Feather name="layers" size={22} color={colors.primary} />
            </View>
            <Text style={[styles.actionTitle, { color: colors.text }]}>
              Manage Wards
            </Text>
            <Text style={[styles.actionSub, { color: colors.textTertiary }]}>
              Ward overview
            </Text>
          </Pressable>

          <Pressable
            onPress={navigateTo('/(admin)/staff/add')}
            style={({ pressed }) => [
              styles.actionTile,
              styles.actionSecondary,
              shadows.card,
              {
                backgroundColor: colors.surface,
                shadowColor: '#1B2A4A',
                opacity: pressed ? 0.88 : 1,
              },
            ]}
          >
            <View
              style={[
                styles.actionIconWrap,
                { backgroundColor: colors.primaryMuted },
              ]}
            >
              <Feather name="user-check" size={22} color={colors.primary} />
            </View>
            <Text style={[styles.actionTitle, { color: colors.text }]}>
              Add Staff
            </Text>
            <Text style={[styles.actionSub, { color: colors.textTertiary }]}>
              Receptionist / Pharmacist
            </Text>
          </Pressable>
        </View>

        <Card title="Operations" subtitle="System management tools">
          <Pressable
            onPress={navigateTo('/(admin)/users')}
            style={({ pressed }) => [
              styles.opsRow,
              {
                backgroundColor: pressed
                  ? colors.surfaceTertiary
                  : 'transparent',
              },
            ]}
          >
            <Feather name="users" size={18} color={colors.primary} />
            <Text style={[styles.opsRowText, { color: colors.text }]}>
              Doctor Directory
            </Text>
            <View style={styles.opsSpacer} />
            <Feather
              name="chevron-right"
              size={18}
              color={colors.textTertiary}
            />
          </Pressable>

          <View style={[styles.opsDivider, { backgroundColor: colors.divider }]} />

          <Pressable
            onPress={navigateTo('/(admin)/pharmacy')}
            style={({ pressed }) => [
              styles.opsRow,
              {
                backgroundColor: pressed
                  ? colors.surfaceTertiary
                  : 'transparent',
              },
            ]}
          >
            <Feather name="package" size={18} color={colors.primary} />
            <Text style={[styles.opsRowText, { color: colors.text }]}>
              Pharmacy Inventory
            </Text>
            <View style={styles.opsSpacer} />
            <Feather
              name="chevron-right"
              size={18}
              color={colors.textTertiary}
            />
          </Pressable>

          <View style={[styles.opsDivider, { backgroundColor: colors.divider }]} />

          <Pressable
            onPress={navigateTo('/(admin)/billing')}
            style={({ pressed }) => [
              styles.opsRow,
              {
                backgroundColor: pressed
                  ? colors.surfaceTertiary
                  : 'transparent',
              },
            ]}
          >
            <Feather name="credit-card" size={18} color={colors.primary} />
            <Text style={[styles.opsRowText, { color: colors.text }]}>
              Finance Overview
            </Text>
            <View style={styles.opsSpacer} />
            <Feather
              name="chevron-right"
              size={18}
              color={colors.textTertiary}
            />
          </Pressable>

          <View style={[styles.opsDivider, { backgroundColor: colors.divider }]} />

          <Pressable
            onPress={navigateTo('/(admin)/staff')}
            style={({ pressed }) => [
              styles.opsRow,
              {
                backgroundColor: pressed
                  ? colors.surfaceTertiary
                  : 'transparent',
              },
            ]}
          >
            <Feather name="users" size={18} color={colors.primary} />
            <Text style={[styles.opsRowText, { color: colors.text }]}>
              Staff Directory
            </Text>
            <View style={styles.opsSpacer} />
            <Feather
              name="chevron-right"
              size={18}
              color={colors.textTertiary}
            />
          </Pressable>

          <View style={[styles.opsDivider, { backgroundColor: colors.divider }]} />

          <Pressable
            onPress={navigateTo('/(admin)/wards')}
            style={({ pressed }) => [
              styles.opsRow,
              styles.opsRowLast,
              {
                backgroundColor: pressed
                  ? colors.surfaceTertiary
                  : 'transparent',
              },
            ]}
          >
            <Feather name="grid" size={18} color={colors.primary} />
            <Text style={[styles.opsRowText, { color: colors.text }]}>
              Ward Management
            </Text>
            <View style={styles.opsSpacer} />
            <Feather
              name="chevron-right"
              size={18}
              color={colors.textTertiary}
            />
          </Pressable>
        </Card>

        <Button
          title="Add New Doctor"
          variant="accent"
          size="lg"
          icon="user-plus"
          fullWidth
          onPress={navigateTo('/(admin)/doctors/add')}
          style={styles.primaryCta}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.lg,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  adminLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },

  greeting: {
    marginTop: spacing.xs,
  },
  greetingWelcome: {
    fontSize: typography.sm,
    fontWeight: '500',
  },
  greetingName: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginTop: 2,
  },

  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 8,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
  },

  sectionHeader: {
    marginBottom: -4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionTile: {
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 100,
  },
  actionAccent: {
    width: '48.5%',
    justifyContent: 'flex-end',
    gap: 4,
    borderRadius: radius.md,
  },
  actionAccentTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 8,
  },
  actionAccentSub: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.75)',
  },
  actionSecondary: {
    width: '48.5%',
    justifyContent: 'flex-start',
    gap: 10,
  },
  actionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  actionSub: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: -4,
  },

  opsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.sm,
    gap: 12,
  },
  opsRowLast: {
    marginBottom: 0,
  },
  opsRowText: {
    fontSize: 15,
    fontWeight: '600',
  },
  opsSpacer: {
    flex: 1,
  },
  opsDivider: {
    height: 1,
    marginLeft: 30,
  },

  primaryCta: {
    marginTop: spacing.xs,
  },
});
