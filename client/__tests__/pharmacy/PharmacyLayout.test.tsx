import React from 'react';
import { render, screen } from '@testing-library/react-native';
import PharmacyLayout from '@/app/(pharmacist)/pharmacy/_layout';
import { useAuth } from '@/shared/context/AuthContext';

jest.mock('@/shared/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('expo-router', () => {
  const ReactImpl = require('react');
  const { Text } = require('react-native');

  const StackBase = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  const Stack = Object.assign(StackBase, {
    Screen: ({ name, options }: { name: string; options?: { title?: string } }) => (
      <Text>{`screen:${name}:${options?.title ?? ''}`}</Text>
    ),
  });

  const Redirect = ({ href }: { href: string }) => <Text>{`redirect:${href}`}</Text>;

  return {
    Redirect,
    Stack,
  };
});

const mockedUseAuth = useAuth as jest.Mock;

describe('PharmacyLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects non-staff users', () => {
    mockedUseAuth.mockReturnValue({ user: { role: 'patient' } });

    render(<PharmacyLayout />);

    expect(screen.getByText('redirect:/(patient)')).toBeTruthy();
  });

  it('renders stack screens for staff users', () => {
    mockedUseAuth.mockReturnValue({ user: { role: 'pharmacist' } });

    render(<PharmacyLayout />);

    expect(screen.getByText('screen:index:Pharmacy Inventory')).toBeTruthy();
    expect(screen.getByText('screen:add-medicine:Add Medication')).toBeTruthy();
  });
});
