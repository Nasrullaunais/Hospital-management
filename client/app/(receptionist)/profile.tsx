import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Button, Card } from '@/components/ui';
import { useAuth } from '@/shared/context/AuthContext';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { spacing, radius } from '@/constants/ThemeTokens';

const TAB_BAR_HEIGHT = 70;

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function ProfileScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { user, logout } = useAuth();

  const initials = getInitials(user?.name ?? '');
  const avatarBg = theme.primaryMuted;
  const avatarTextColor = theme.primary;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Profile</Text>
        </View>

        <Card style={styles.profileCard}>
          <View style={styles.avatarSection}>
            <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
              <Text style={[styles.avatarText, { color: avatarTextColor }]}>{initials}</Text>
            </View>
            <Text style={[styles.userName, { color: theme.text }]}>
              {user?.name ?? 'Receptionist'}
            </Text>
            <Text style={[styles.userRole, { color: theme.primary }]}>
              {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : ''}
            </Text>
          </View>
        </Card>

        <Card title="Account Details" style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <View style={[styles.iconContainer, { backgroundColor: theme.primaryMuted }]}>
              <Feather name="mail" size={18} color={theme.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Email</Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>
                {user?.email ?? 'N/A'}
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.divider }]} />

          <View style={styles.detailRow}>
            <View style={[styles.iconContainer, { backgroundColor: theme.primaryMuted }]}>
              <Feather name="phone" size={18} color={theme.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Phone</Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>
                {user?.phone || 'Not provided'}
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.divider }]} />

          <View style={styles.detailRow}>
            <View style={[styles.iconContainer, { backgroundColor: theme.primaryMuted }]}>
              <Feather name="shield" size={18} color={theme.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Role</Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>
                {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'N/A'}
              </Text>
            </View>
          </View>
        </Card>

        <Card title="Account Info" style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <View style={[styles.iconContainer, { backgroundColor: theme.primaryMuted }]}>
              <Feather name="calendar" size={18} color={theme.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Member Since</Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>
                {user?.createdAt
                  ? new Date(user.createdAt).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'N/A'}
              </Text>
            </View>
          </View>
        </Card>

        <Button
          title="Sign Out"
          onPress={() =>
            Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign Out', style: 'destructive', onPress: logout },
            ])
          }
          variant="danger"
          size="lg"
          fullWidth
          icon="log-out"
          style={styles.signOutButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  content: {
    padding: spacing.md,
    paddingBottom: TAB_BAR_HEIGHT + spacing.lg,
    gap: spacing.md,
  },
  header: {
    marginBottom: spacing.xs,
  },
  title: { fontSize: 28, fontWeight: '700' },
  profileCard: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  avatarSection: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  userRole: {
    fontSize: 14,
    fontWeight: '500',
  },
  detailsCard: {
    padding: spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '500',
  },
  signOutButton: {
    marginTop: spacing.md,
  },
  divider: {
    height: 1,
    marginVertical: spacing.xs,
  },
});
