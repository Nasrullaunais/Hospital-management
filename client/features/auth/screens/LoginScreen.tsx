import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '@/shared/context/AuthContext';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FormErrors {
  email?: string;
  password?: string;
  server?: string;
}

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
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

    try {
      setLoading(true);
      setErrors({});
      await login(email.trim().toLowerCase(), password);
      router.replace('/(tabs)');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed. Please try again.';
      setErrors({ server: message });
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (field: string, hasError?: string) => [
    styles.input,
    focusedField === field && styles.inputFocused,
    hasError ? styles.inputError : null,
  ];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Hospital Management</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>

        {errors.server ? (
          <View style={styles.serverError}>
            <Text style={styles.serverErrorText}>{errors.server}</Text>
          </View>
        ) : null}

        {/* Email */}
        <TextInput
          style={inputStyle('email', errors.email)}
          placeholder="Email address"
          placeholderTextColor="#999"
          value={email}
          onChangeText={(v) => { setEmail(v); clearError('email'); clearError('server'); }}
          onBlur={() => { setFocusedField(null); setErrors((p) => ({ ...p, email: validateEmail() })); }}
          onFocus={() => setFocusedField('email')}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
          returnKeyType="next"
        />
        {errors.email ? <Text style={styles.fieldError}>{errors.email}</Text> : null}

        {/* Password with show/hide toggle */}
        <View style={[
          styles.passwordRow,
          focusedField === 'password' && styles.inputFocused,
          errors.password ? styles.inputError : null,
        ]}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Password"
            placeholderTextColor="#999"
            value={password}
            onChangeText={(v) => { setPassword(v); clearError('password'); clearError('server'); }}
            onBlur={() => { setFocusedField(null); setErrors((p) => ({ ...p, password: validatePassword() })); }}
            onFocus={() => setFocusedField('password')}
            secureTextEntry={!showPassword}
            editable={!loading}
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />
          <TouchableOpacity onPress={() => setShowPassword((s) => !s)} style={styles.eyeBtn}>
            <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁'}</Text>
          </TouchableOpacity>
        </View>
        {errors.password ? <Text style={styles.fieldError}>{errors.password}</Text> : null}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <View style={styles.linkRow}>
          <Text style={styles.linkText}>Don't have an account? </Text>
          <Link href="/register" asChild>
            <TouchableOpacity>
              <Text style={styles.linkAction}>Create Account</Text>
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
    paddingHorizontal: 24,
    paddingVertical: 40,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    color: '#1a1a2e',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 32,
  },
  serverError: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  serverErrorText: {
    color: '#b91c1c',
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 4,
    backgroundColor: '#fafafa',
    color: '#1a1a2e',
  },
  inputFocused: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  fieldError: {
    color: '#ef4444',
    fontSize: 12,
    marginBottom: 12,
    marginLeft: 4,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fafafa',
    marginBottom: 4,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1a1a2e',
  },
  eyeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  eyeIcon: {
    fontSize: 18,
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  linkText: {
    color: '#666',
    fontSize: 14,
  },
  linkAction: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '600',
  },
});
