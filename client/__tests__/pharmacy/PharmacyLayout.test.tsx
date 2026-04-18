import React from 'react';
import { render, screen } from '@testing-library/react-native';
import PharmacistLayout from '@/app/(pharmacist)/_layout';
import { useAuth } from '@/shared/context/AuthContext';

jest.mock('@/shared/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('expo-router', () => {
  const ReactImpl = require('react');
  const { Text } = require('react-native');

  const TabsBase = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  const Tabs = Object.assign(TabsBase, {
    Screen: ({ name, options }: { name: string; options?: { title?: string } }) => (
      <Text>{`tab:${name}:${options?.title ?? ''}`}</Text>
    ),
  });

  const Redirect = ({ href }: { href: string }) => <Text>{`redirect:${href}`}</Text>;

  return {
    Redirect,
    Tabs,
  };
});

const mockedUseAuth = useAuth as jest.Mock;

describe('PharmacistLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects non-pharmacist users', () => {
    mockedUseAuth.mockReturnValue({ user: { role: 'patient' }, isLoading: false });

    render(<PharmacistLayout />);

    expect(screen.getByText('redirect:/(patient)')).toBeTruthy();
  });

  it('shows loading indicator while auth is loading', () => {
    mockedUseAuth.mockReturnValue({ user: null, isLoading: true });

    render(<PharmacistLayout />);

    expect(screen.getByTestId('loading')).toBeTruthy();
  });

  it('renders tabs for pharmacist users', () => {
    mockedUseAuth.mockReturnValue({ user: { role: 'pharmacist', name: 'Test Pharmacist' }, isLoading: false });

    render(<PharmacistLayout />);

    expect(screen.getByText('tab:index:Home')).toBeTruthy();
    expect(screen.getByText('tab:pharmacy:Inventory')).toBeTruthy();
    expect(screen.getByText('tab:profile:Profile')).toBeTruthy();
  });
});
