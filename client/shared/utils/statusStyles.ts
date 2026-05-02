import type { Theme } from '@/constants/Colors';

type ThemeColors = Theme;

export function getPaymentStatusStyle(status: string, theme: ThemeColors) {
  const key = status.toLowerCase();
  switch (key) {
    case 'unpaid':
      return { bg: theme.errorBg, text: theme.error };
    case 'pending verification':
      return { bg: theme.warningBg, text: theme.warning };
    case 'paid':
      return { bg: theme.successBg, text: theme.success };
    case 'overdue':
      return { bg: theme.error, text: '#FFFFFF' };
    default:
      return { bg: theme.surfaceTertiary, text: theme.textSecondary };
  }
}

export function getAppointmentStatusStyle(status: string, theme: ThemeColors) {
  switch (status) {
    case 'Pending':
      return { bg: theme.warningBg, text: theme.warning };
    case 'Confirmed':
      return { bg: theme.infoBg, text: theme.info };
    case 'Completed':
      return { bg: theme.successBg, text: theme.success };
    case 'Cancelled':
      return { bg: theme.errorBg, text: theme.error };
    default:
      return { bg: theme.surfaceTertiary, text: theme.textSecondary };
  }
}

export function getPrescriptionStatusStyle(status: string, theme: ThemeColors) {
  switch (status.toLowerCase()) {
    case 'active':
      return { bg: theme.infoBg, text: theme.info };
    case 'fulfilled':
      return { bg: theme.successBg, text: theme.success };
    case 'cancelled':
      return { bg: theme.errorBg, text: theme.error };
    default:
      return { bg: theme.surfaceTertiary, text: theme.textSecondary };
  }
}