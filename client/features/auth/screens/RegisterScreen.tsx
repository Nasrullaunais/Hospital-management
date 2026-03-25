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
  Alert,
} from 'react-native';
import { authService, type RegisterPayload } from '../services/auth.service';
import { useAuth } from '@/shared/context/AuthContext';

/**
 * RegisterScreen — Member 1
 * New patient self-registration form.
 * TODO: Add inline field validation errors below each TextInput.
 * TODO: Add date picker for dateOfBirth.
 */
export default function RegisterScreen() {
  const { login } = useAuth();

  const [form, setForm] = useState<RegisterPayload>({
    name: '',
    email: '',
    password: '',
    phone: '',
    dateOfBirth: '',
  });
  const [loading, setLoading] = useState(false);

  const update = (field: keyof RegisterPayload) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleRegister = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      Alert.alert('Validation', 'Name, email, and password are required.');
      return;
    }

    try {
      setLoading(true);
      // Register then immediately log in (backend returns token on register too)
      await authService.register(form);
      await login(form.email.trim().toLowerCase(), form.password);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      Alert.alert('Registration Failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Register as a patient</Text>

        <TextInput
          style={styles.input}
          placeholder="Full name *"
          value={form.name}
          onChangeText={update('name')}
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder="Email address *"
          value={form.email}
          onChangeText={update('email')}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder="Password * (min 8 characters)"
          value={form.password}
          onChangeText={update('password')}
          secureTextEntry
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder="Phone number (optional)"
          value={form.phone}
          onChangeText={update('phone')}
          keyboardType="phone-pad"
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder="Date of birth — YYYY-MM-DD (optional)"
          value={form.dateOfBirth}
          onChangeText={update('dateOfBirth')}
          editable={!loading}
        />

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

        {/* TODO: Add "Already have an account? Sign in" link */}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
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
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#fafafa',
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
});
