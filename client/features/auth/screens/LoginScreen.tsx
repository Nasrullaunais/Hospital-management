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
import { useAuth } from '@/shared/context/AuthContext';
import { useToast } from '@/shared/providers/ToastProvider';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Input, Button } from '@/components/ui';
import { spacing, radius } from '@/constants/ThemeTokens';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FormErrors {
  email?: string;
  password?: string;
}

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  const clearError = (field: keyof FormErrors) =>
    setErrors((prev) => ({ ...prev, [field]: undefined }));

  const validateEmail = () => {
    if (!email.trim()) return 'Email address is required.';
    if (!EMAIL_RE.test(email.trim())) return 'Please enter a valid email address.';
    return undefined;
  };

  const validatePassword = () => {
    if (!password) return 'Password is required.';
    return undefined;
  };

  const validateAll = (): boolean => {
    const next: FormErrors = {
      email: validateEmail(),
      password: validatePassword(),
    };
    setErrors(next);
    return !Object.values(next).some(Boolean);
  };

  const handleLogin = async () => {
    if (!validateAll()) return;

    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      toast.showSuccess('Welcome back!');
      router.replace('/');
    } catch {
      // Error toast is shown automatically by apiClient interceptor
    } finally {
      setLoading(false);
    }
  };

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
          <Text style={[styles.title, { color: colors.text }]}>Hospital Management</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Sign in to your account</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Email address"
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
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={(v) => { setPassword(v); clearError('password'); }}
            onBlur={() => setErrors((p) => ({ ...p, password: validatePassword() }))}
            error={errors.password}
            secureTextEntry={!showPassword}
            editable={!loading}
            returnKeyType="done"
            onSubmitEditing={handleLogin}
            leftIcon={<Feather name="lock" size={18} color={colors.textTertiary} />}
            rightIcon={
              <TouchableOpacity onPress={() => setShowPassword((s) => !s)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            }
          />

          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
            fullWidth
            style={styles.button}
          />
        </View>

        <View style={styles.linkRow}>
          <Text style={[styles.linkText, { color: colors.textSecondary }]}>Don't have an account? </Text>
          <Link href="/register" asChild>
            <TouchableOpacity>
              <Text style={[styles.linkAction, { color: colors.primary }]}>Create Account</Text>
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
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxl,
  },
  header: {
    marginBottom: spacing.xl,
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
  form: {
    gap: spacing.xs,
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