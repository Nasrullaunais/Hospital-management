import React from 'react';
import { render, screen } from '@testing-library/react-native';
import AppIndexRoute from '@/app/index';
import { useAuth } from '@/shared/context/AuthContext';

jest.mock('@/shared/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('expo-router', () => {
  const ReactImpl = require('react');
  const { Text } = require('react-native');

  return {
    Redirect: ({ href }: { href: string }) => ReactImpl.createElement(Text, null, `redirect:${href}`),
  };
});

const mockedUseAuth = useAuth as jest.Mock;

describe('AppIndexRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading indicator while auth is bootstrapping', () => {
    mockedUseAuth.mockReturnValue({ isLoading: true, user: null });

    render(<AppIndexRoute />);

    expect(screen.getByTestId('app-index-loading')).toBeTruthy();
  });

  it('redirects anonymous users to login', () => {
    mockedUseAuth.mockReturnValue({ isLoading: false, user: null });

    render(<AppIndexRoute />);

    expect(screen.getByText('redirect:/login')).toBeTruthy();
  });

  it('redirects patient users to patient routes', () => {
    mockedUseAuth.mockReturnValue({ isLoading: false, user: { role: 'patient' } });

    render(<AppIndexRoute />);

    expect(screen.getByText('redirect:/(patient)')).toBeTruthy();
  });

  it('redirects doctor users to doctor routes', () => {
    mockedUseAuth.mockReturnValue({ isLoading: false, user: { role: 'doctor' } });

    render(<AppIndexRoute />);

    expect(screen.getByText('redirect:/(doctor)')).toBeTruthy();
  });

  it('redirects pharmacist users to pharmacist routes', () => {
    mockedUseAuth.mockReturnValue({ isLoading: false, user: { role: 'pharmacist' } });

    render(<AppIndexRoute />);

    expect(screen.getByText('redirect:/(pharmacist)')).toBeTruthy();
  });

  it('redirects admin users to admin routes', () => {
    mockedUseAuth.mockReturnValue({ isLoading: false, user: { role: 'admin' } });

    render(<AppIndexRoute />);

    expect(screen.getByText('redirect:/(admin)')).toBeTruthy();
  });
});
