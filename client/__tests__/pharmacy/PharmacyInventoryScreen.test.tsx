import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import PharmacyInventoryScreen from '@/app/(tabs)/pharmacy/index';
import { useAuth } from '@/shared/context/AuthContext';
import { medicineService } from '@/features/pharmacy/services/medicine.service';

const mockPush = jest.fn();

jest.mock('@/shared/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/features/pharmacy/services/medicine.service', () => ({
  medicineService: {
    getMedicines: jest.fn(),
  },
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

const mockedUseAuth = useAuth as jest.Mock;
const mockedGetMedicines = medicineService.getMedicines as jest.Mock;

describe('PharmacyInventoryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders low-stock badge and allows admin navigation to add medicine', async () => {
    mockedUseAuth.mockReturnValue({ user: { role: 'admin' } });
    mockedGetMedicines.mockResolvedValue([
      {
        _id: 'm1',
        name: 'Amoxicillin',
        category: 'Antibiotic',
        price: 12.5,
        stockQuantity: 5,
        expiryDate: new Date(Date.now() + 86400000 * 120).toISOString(),
        packagingImageUrl: '/uploads/amox.png',
      },
      {
        _id: 'm2',
        name: 'Ibuprofen',
        category: 'Painkiller',
        price: 4,
        stockQuantity: 25,
        expiryDate: new Date(Date.now() + 86400000 * 240).toISOString(),
        packagingImageUrl: '/uploads/ibu.png',
      },
    ]);

    render(<PharmacyInventoryScreen />);

    expect(await screen.findByText('Amoxicillin')).toBeTruthy();
    expect(screen.getByText('Low Stock')).toBeTruthy();
    expect(screen.getByText('Stock: 5')).toBeTruthy();
    expect(screen.getByText('Add Medication')).toBeTruthy();

    fireEvent.press(screen.getByText('Add Medication'));
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/pharmacy/add-medicine');
  });

  it('hides add button for doctor role', async () => {
    mockedUseAuth.mockReturnValue({ user: { role: 'doctor' } });
    mockedGetMedicines.mockResolvedValue([]);

    render(<PharmacyInventoryScreen />);

    expect(await screen.findByText('No medicines in inventory.')).toBeTruthy();
    expect(screen.queryByText('Add Medication')).toBeNull();
  });

  it('shows retry flow when fetch fails', async () => {
    mockedUseAuth.mockReturnValue({ user: { role: 'admin' } });
    mockedGetMedicines
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockResolvedValueOnce([]);

    render(<PharmacyInventoryScreen />);

    expect(await screen.findByText('Failed to fetch')).toBeTruthy();

    fireEvent.press(screen.getByText('Retry'));

    await waitFor(() => {
      expect(screen.getByText('No medicines in inventory.')).toBeTruthy();
    });

    expect(mockedGetMedicines).toHaveBeenCalledTimes(2);
  });
});
