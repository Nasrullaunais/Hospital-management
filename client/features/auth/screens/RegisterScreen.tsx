import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useAuth } from '@/shared/context/AuthContext';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Input, Button } from '@/components/ui';
import { spacing } from '@/constants/ThemeTokens';
import type { RegisterPayload } from '../services/auth.service';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9\s\-().]{7,20}$/;

interface PwdStrength {
  minLen: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasDigit: boolean;
}

function checkPassword(pw: string): PwdStrength {
  return {
    minLen: pw.length >= 8,
    hasUpper: /[A-Z]/.test(pw),
    hasLower: /[a-z]/.test(pw),
    hasDigit: /[0-9]/.test(pw),
  };
}

function isPasswordValid(s: PwdStrength) {
  return s.minLen && s.hasUpper && s.hasLower && s.hasDigit;
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  phone?: string;
  server?: string;
}

export default function RegisterScreen() {
  const { register } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState<Date | null>(null);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  const pwdStrength = checkPassword(password);

  const clearError = (field: keyof FormErrors) =>
    setErrors((prev) => ({ ...prev, [field]: undefined }));

  const validateName = () => {
    if (!name.trim()) return 'Full name is required.';
    if (name.trim().length < 2) return 'Name must be at least 2 characters.';
    return undefined;
  };

  const validateEmail = () => {
    if (!email.trim()) return 'Email address is required.';
    if (!EMAIL_RE.test(email.trim())) return 'Please enter a valid email address.';
    return undefined;
  };

  const validatePassword = () => {
    if (!password) return 'Password is required.';
    if (!isPasswordValid(pwdStrength)) return 'Password does not meet all requirements.';
    return undefined;
  };

  const validateConfirm = () => {
    if (!confirmPassword) return 'Please confirm your password.';
    if (confirmPassword !== password) return 'Passwords do not match.';
    return undefined;
  };

  const validatePhone = () => {
    if (phone.trim() && !PHONE_RE.test(phone.trim())) return 'Please enter a valid phone number.';
    return undefined;
  };

  const validateAll = (): boolean => {
    const next: FormErrors = {
      name: validateName(),
      email: validateEmail(),
      password: validatePassword(),
      confirmPassword: validateConfirm(),
      phone: validatePhone(),
    };
    setErrors(next);
    return !Object.values(next).some(Boolean);
  };

  const handleRegister = async () => {
    if (!validateAll()) return;

    const payload: RegisterPayload = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      ...(phone.trim() ? { phone: phone.trim() } : {}),
      ...(dob ? { dateOfBirth: formatDate(dob) } : {}),
    };

    try {
      setLoading(true);
      setErrors({});
      await register(payload);
      router.replace('/');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      setErrors((prev) => ({ ...prev, server: message }));
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selected) setDob(selected);
  };

  const ReqRow = ({ met, label }: { met: boolean; label: string }) => (
    <View style={styles.reqRow}>
      <Feather name={met ? 'check-circle' : 'circle'} size={12} color={met ? colors.success : colors.textTertiary} style={{ marginRight: 6 }} />
      <Text style={[styles.reqLabel, { color: met ? colors.success : colors.textTertiary }]}>{label}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Register as a patient</Text>
        </View>

        {errors.server ? (
          <View style={[styles.serverError, { backgroundColor: colors.errorBg, borderColor: colors.error }]}>
            <Feather name="alert-circle" size={18} color={colors.error} style={{ marginRight: 8 }} />
            <Text style={[styles.serverErrorText, { color: colors.error }]}>{errors.server}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <Input
            label="Full name *"
            placeholder="Enter your full name"
            value={name}
            onChangeText={(v) => { setName(v); clearError('name'); }}
            onBlur={() => setErrors((p) => ({ ...p, name: validateName() }))}
            error={errors.name}
            autoCapitalize="words"
            autoCorrect={false}
            editable={!loading}
            returnKeyType="next"
            leftIcon={<Feather name="user" size={18} color={colors.textTertiary} />}
          />

          <Input
            label="Email address *"
            placeholder="Enter your email"
            value={email}
            onChangeText={(v) => { setEmail(v); clearError('email'); }}
            onBlur={() => setErrors((p) => ({ ...p, email: validateEmail() }))}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
            returnKeyType="next"
            leftIcon={<Feather name="mail" size={18} color={colors.textTertiary} />}
          />

          <Input
            label="Password *"
            placeholder="Create a password"
            value={password}
            onChangeText={(v) => { setPassword(v); clearError('password'); }}
            onBlur={() => setErrors((p) => ({ ...p, password: validatePassword() }))}
            error={errors.password}
            secureTextEntry={!showPassword}
            editable={!loading}
            returnKeyType="next"
            leftIcon={<Feather name="lock" size={18} color={colors.textTertiary} />}
            rightIcon={
              <TouchableOpacity onPress={() => setShowPassword((s) => !s)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            }
          />

          {password.length > 0 && (
            <View style={styles.reqContainer}>
              <ReqRow met={pwdStrength.minLen} label="At least 8 characters" />
              <ReqRow met={pwdStrength.hasUpper} label="One uppercase letter" />
              <ReqRow met={pwdStrength.hasLower} label="One lowercase letter" />
              <ReqRow met={pwdStrength.hasDigit} label="One number" />
            </View>
          )}

          <Input
            label="Confirm password *"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChangeText={(v) => { setConfirmPassword(v); clearError('confirmPassword'); }}
            onBlur={() => setErrors((p) => ({ ...p, confirmPassword: validateConfirm() }))}
            error={errors.confirmPassword}
            secureTextEntry={!showConfirm}
            editable={!loading}
            returnKeyType="next"
            leftIcon={<Feather name="lock" size={18} color={colors.textTertiary} />}
            rightIcon={
              <TouchableOpacity onPress={() => setShowConfirm((s) => !s)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Feather name={showConfirm ? 'eye-off' : 'eye'} size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            }
          />

          <Input
            label="Phone number (optional)"
            placeholder="Enter your phone number"
            value={phone}
            onChangeText={(v) => { setPhone(v); clearError('phone'); }}
            onBlur={() => setErrors((p) => ({ ...p, phone: validatePhone() }))}
            error={errors.phone}
            keyboardType="phone-pad"
            editable={!loading}
            returnKeyType="next"
            leftIcon={<Feather name="phone" size={18} color={colors.textTertiary} />}
          />

          <View style={styles.dobContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Date of birth (optional)</Text>
            <TouchableOpacity
              style={[styles.dobButton, { backgroundColor: colors.inputBackground, borderColor: errors.server ? colors.inputErrorBorder : colors.inputBorder }]}
              onPress={() => setShowDatePicker(true)}
              disabled={loading}
            >
              <Feather name="calendar" size={18} color={colors.textTertiary} />
              <Text style={dob ? [styles.dobValue, { color: colors.text }] : [styles.dobPlaceholder, { color: colors.textTertiary }]}>
                {dob ? formatDate(dob) : 'Select date of birth'}
              </Text>
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={dob ?? new Date(2000, 0, 1)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={new Date()}
              onChange={onDateChange}
            />
          )}

          <Button
            title="Create Account"
            onPress={handleRegister}
            loading={loading}
            disabled={loading}
            fullWidth
            style={styles.button}
          />
        </View>

        <View style={styles.linkRow}>
          <Text style={[styles.linkText, { color: colors.textSecondary }]}>Already have an account? </Text>
          <Link href="/login" asChild>
            <TouchableOpacity>
              <Text style={[styles.linkAction, { color: colors.primary }]}>Sign In</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  serverError: {
    borderWidth: 1,
    borderRadius: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  serverErrorText: {
    fontSize: 14,
    flex: 1,
  },
  form: {
    gap: spacing.xs,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  dobContainer: {
    marginBottom: spacing.sm,
  },
  dobButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderRadius: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  dobPlaceholder: {
    fontSize: 16,
  },
  dobValue: {
    fontSize: 16,
  },
  reqContainer: {
    marginBottom: spacing.sm,
    paddingHorizontal: 4,
  },
  reqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  reqLabel: {
    fontSize: 12,
  },
  button: {
    marginTop: spacing.md,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  linkText: {
    fontSize: 14,
  },
  linkAction: {
    fontSize: 14,
    fontWeight: '600',
  },
});