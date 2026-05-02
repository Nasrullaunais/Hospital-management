import React from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { spacing, radius, shadows, typography } from '@/constants/ThemeTokens';

type StaffCard = {
  key: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Feather.glyphMap;
  iconBg: string;
  iconColor: string;
  viewAllPath: string;
  addPath: string;
};

export default function UsersHubScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const navigateTo = (path: string) => () => {
    router.push(path as never);
  };

  const cards: StaffCard[] = [
    {
      key: 'doctors',
      title: 'Doctors',
      subtitle: 'Manage doctor profiles, specializations, and availability',
      icon: 'activity',
      iconBg: colors.accent,
      iconColor: '#FFFFFF',
      viewAllPath: '/(admin)/doctors',
      addPath: '/(admin)/doctors/add',
    },
    {
      key: 'receptionists',
      title: 'Receptionists',
      subtitle: 'Front desk and patient intake staff',
      icon: 'user-check',
      iconBg: colors.success,
      iconColor: '#FFFFFF',
      viewAllPath: '/(admin)/staff?role=receptionist',
      addPath: '/(admin)/staff/add?role=receptionist',
    },
    {
      key: 'pharmacists',
      title: 'Pharmacists',
      subtitle: 'Medication and prescription management staff',
      icon: 'package',
      iconBg: colors.warning,
      iconColor: '#FFFFFF',
      viewAllPath: '/(admin)/staff?role=pharmacist',
      addPath: '/(admin)/staff/add?role=pharmacist',
    },
  ];

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Staff Management
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Manage doctors, receptionists, and pharmacists
          </Text>
        </View>

        {cards.map((card) => (
          <View
            key={card.key}
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                shadowColor: '#1B2A4A',
              },
            ]}
          >
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: card.iconBg },
              ]}
            >
              <Feather name={card.icon} size={22} color={card.iconColor} />
            </View>

            <Text style={[styles.cardTitle, { color: colors.text }]}>
              {card.title}
            </Text>
            <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
              {card.subtitle}
            </Text>

            <View style={styles.buttonRow}>
              <Pressable
                onPress={navigateTo(card.viewAllPath)}
                style={({ pressed }) => [
                  styles.btnOutline,
                  {
                    borderColor: colors.primary,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Text style={[styles.btnOutlineText, { color: colors.primary }]}>
                  View All
                </Text>
              </Pressable>

              <Pressable
                onPress={navigateTo(card.addPath)}
                style={({ pressed }) => [
                  styles.btnAccent,
                  {
                    backgroundColor: colors.accent,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Feather name="plus" size={16} color="#FFFFFF" />
                <Text style={styles.btnAccentText}>Add</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },

  header: {
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: typography.sm,
    fontWeight: '500',
    lineHeight: typography.sm * typography.relaxed,
  },

  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    ...shadows.card,
    gap: spacing.sm,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  cardTitle: {
    fontSize: typography.lg,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontSize: typography.sm,
    fontWeight: '500',
    lineHeight: typography.sm * typography.relaxed,
    marginBottom: spacing.xs,
  },

  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  btnOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1.5,
    gap: spacing.xs,
  },
  btnOutlineText: {
    fontSize: 14,
    fontWeight: '600',
  },
  btnAccent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: radius.md,
    gap: spacing.xs,
  },
  btnAccentText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
