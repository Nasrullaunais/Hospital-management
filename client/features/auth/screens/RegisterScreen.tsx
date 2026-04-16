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
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useAuth } from '@/shared/context/AuthContext';
import type { RegisterPayload } from '../services/auth.service';

// ── Validation helpers ─────────────────────────────────────────────────────────

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

// ── Component ──────────────────────────────────────────────────────────────────

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

  // Form values
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState<Date | null>(null);

  // UI state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  const pwdStrength = checkPassword(password);

  // ── Field-level validation ─────────────────────────────────────────────────

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

  // ── Submit ─────────────────────────────────────────────────────────────────

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

  // ── Date picker handler ────────────────────────────────────────────────────

  const onDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
    setShowDatePicker(Platform.OS === 'ios'); // keep open on iOS until dismissed
    if (selected) setDob(selected);
  };

  // ── Render helpers ─────────────────────────────────────────────────────────

  const inputStyle = (field: string, hasError?: string) => [
    styles.input,
    focusedField === field && styles.inputFocused,
    hasError ? styles.inputError : null,
  ];

  const ReqRow = ({ met, label }: { met: boolean; label: string }) => (
    <View style={styles.reqRow}>
      <Text style={[styles.reqDot, met ? styles.reqMet : styles.reqUnmet]}>
        {met ? '✓' : '○'}
      </Text>
      <Text style={[styles.reqLabel, met ? styles.reqMet : styles.reqUnmet]}>{label}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Register as a patient</Text>

        {/* Server-level error banner */}
        {errors.server ? (
          <View style={styles.serverError}>
            <Text style={styles.serverErrorText}>{errors.server}</Text>
          </View>
        ) : null}

        {/* Full Name */}
        <TextInput
          style={inputStyle('name', errors.name)}
          placeholder="Full name *"
          placeholderTextColor="#999"
          value={name}
          onChangeText={(v) => { setName(v); clearError('name'); }}
          onBlur={() => { setFocusedField(null); setErrors((p) => ({ ...p, name: validateName() })); }}
          onFocus={() => setFocusedField('name')}
          autoCapitalize="words"
          autoCorrect={false}
          editable={!loading}
          returnKeyType="next"
        />
        {errors.name ? <Text style={styles.fieldError}>{errors.name}</Text> : null}

        {/* Email */}
        <TextInput
          style={inputStyle('email', errors.email)}
          placeholder="Email address *"
          placeholderTextColor="#999"
          value={email}
          onChangeText={(v) => { setEmail(v); clearError('email'); }}
          onBlur={() => { setFocusedField(null); setErrors((p) => ({ ...p, email: validateEmail() })); }}
          onFocus={() => setFocusedField('email')}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
          returnKeyType="next"
        />
        {errors.email ? <Text style={styles.fieldError}>{errors.email}</Text> : null}

        {/* Password */}
        <View style={[styles.passwordRow, focusedField === 'password' && styles.inputFocused, errors.password ? styles.inputError : null]}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Password *"
            placeholderTextColor="#999"
            value={password}
            onChangeText={(v) => { setPassword(v); clearError('password'); }}
            onBlur={() => { setFocusedField(null); setErrors((p) => ({ ...p, password: validatePassword() })); }}
            onFocus={() => setFocusedField('password')}
            secureTextEntry={!showPassword}
            editable={!loading}
            returnKeyType="next"
          />
          <TouchableOpacity onPress={() => setShowPassword((s) => !s)} style={styles.eyeBtn}>
            <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁'}</Text>
          </TouchableOpacity>
        </View>
        {errors.password ? <Text style={styles.fieldError}>{errors.password}</Text> : null}

        {/* Password strength checklist — shown only while typing */}
        {password.length > 0 && (
          <View style={styles.reqContainer}>
            <ReqRow met={pwdStrength.minLen} label="At least 8 characters" />
            <ReqRow met={pwdStrength.hasUpper} label="One uppercase letter" />
            <ReqRow met={pwdStrength.hasLower} label="One lowercase letter" />
            <ReqRow met={pwdStrength.hasDigit} label="One number" />
          </View>
        )}

        {/* Confirm Password */}
        <View style={[styles.passwordRow, focusedField === 'confirm' && styles.inputFocused, errors.confirmPassword ? styles.inputError : null]}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Confirm password *"
            placeholderTextColor="#999"
            value={confirmPassword}
            onChangeText={(v) => { setConfirmPassword(v); clearError('confirmPassword'); }}
            onBlur={() => { setFocusedField(null); setErrors((p) => ({ ...p, confirmPassword: validateConfirm() })); }}
            onFocus={() => setFocusedField('confirm')}
            secureTextEntry={!showConfirm}
            editable={!loading}
            returnKeyType="next"
          />
          <TouchableOpacity onPress={() => setShowConfirm((s) => !s)} style={styles.eyeBtn}>
            <Text style={styles.eyeIcon}>{showConfirm ? '🙈' : '👁'}</Text>
          </TouchableOpacity>
        </View>
        {errors.confirmPassword ? <Text style={styles.fieldError}>{errors.confirmPassword}</Text> : null}

        {/* Phone (optional) */}
        <TextInput
          style={inputStyle('phone', errors.phone)}
          placeholder="Phone number (optional)"
          placeholderTextColor="#999"
          value={phone}
          onChangeText={(v) => { setPhone(v); clearError('phone'); }}
          onBlur={() => { setFocusedField(null); setErrors((p) => ({ ...p, phone: validatePhone() })); }}
          onFocus={() => setFocusedField('phone')}
          keyboardType="phone-pad"
          editable={!loading}
          returnKeyType="next"
        />
        {errors.phone ? <Text style={styles.fieldError}>{errors.phone}</Text> : null}

        {/* Date of Birth */}
        <TouchableOpacity
          style={[styles.dobButton, !loading ? null : styles.buttonDisabled]}
          onPress={() => setShowDatePicker(true)}
          disabled={loading}
        >
          <Text style={dob ? styles.dobValue : styles.dobPlaceholder}>
            {dob ? `Date of Birth: ${formatDate(dob)}` : 'Date of birth (optional)'}
          </Text>
          <Text style={styles.dobIcon}>📅</Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={dob ?? new Date(2000, 0, 1)}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            maximumDate={new Date()}
            onChange={onDateChange}
          />
        )}

        {/* Submit */}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Create Account</Text>
          )}
        </TouchableOpacity>

        <View style={styles.linkRow}>
          <Text style={styles.linkText}>Already have an account? </Text>
          <Link href="/login" asChild>
            <TouchableOpacity>
              <Text style={styles.linkAction}>Sign In</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

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
  // Password row wraps input + eye toggle in a single bordered box
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
  // Password strength checklist
  reqContainer: {
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  reqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  reqDot: {
    fontSize: 12,
    marginRight: 6,
    fontWeight: '700',
  },
  reqLabel: {
    fontSize: 12,
  },
  reqMet: {
    color: '#16a34a',
  },
  reqUnmet: {
    color: '#9ca3af',
  },
  // DOB
  dobButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fafafa',
    marginBottom: 16,
  },
  dobPlaceholder: {
    color: '#999',
    fontSize: 16,
  },
  dobValue: {
    color: '#1a1a2e',
    fontSize: 16,
  },
  dobIcon: {
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
