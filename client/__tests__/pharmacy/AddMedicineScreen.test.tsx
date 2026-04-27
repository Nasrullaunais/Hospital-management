import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import AddMedicineScreen from '@/app/(pharmacist)/pharmacy/add-medicine';
import { useAuth } from '@/shared/context/AuthContext';
import { medicineService } from '@/features/pharmacy/services/medicine.service';
import * as ImagePicker from 'expo-image-picker';

const mockBack = jest.fn();

jest.mock('@/shared/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/features/pharmacy/services/medicine.service', () => ({
  medicineService: {
    createMedicine: jest.fn(),
  },
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
  }),
}));

jest.mock('@react-native-community/datetimepicker', () => {
  return () => null;
});

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

const mockedUseAuth = useAuth as jest.Mock;
const mockedCreateMedicine = medicineService.createMedicine as jest.Mock;
const mockedRequestCameraPermissionsAsync = ImagePicker.requestCameraPermissionsAsync as jest.Mock;
const mockedLaunchCameraAsync = ImagePicker.launchCameraAsync as jest.Mock;

describe('AddMedicineScreen', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  it('blocks non-staff users from submitting', async () => {
    mockedUseAuth.mockReturnValue({ user: { role: 'patient' } });

    render(<AddMedicineScreen />);

    fireEvent.press(screen.getByText('Save Medication'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Validation Error', 'You are not allowed to add medications.');
    });
  });

  it('validates required fields for admin', async () => {
    mockedUseAuth.mockReturnValue({ user: { role: 'admin' } });

    render(<AddMedicineScreen />);

    fireEvent.press(screen.getByText('Save Medication'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Validation Error', 'Medicine name is required.');
    });
  });

  it('shows permission error when camera access is denied', async () => {
    mockedUseAuth.mockReturnValue({ user: { role: 'admin' } });
    mockedRequestCameraPermissionsAsync.mockResolvedValue({ granted: false });

    render(<AddMedicineScreen />);

    fireEvent.press(screen.getByText('Capture Packaging Photo'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Permission Required',
        'Camera permission is required to capture packaging images.',
      );
    });
  });

  it('submits successfully with valid payload and image', async () => {
    mockedUseAuth.mockReturnValue({ user: { role: 'pharmacist' } });
    mockedRequestCameraPermissionsAsync.mockResolvedValue({ granted: true });
    mockedLaunchCameraAsync.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: 'file:///tmp/packaging.jpg',
          mimeType: 'image/jpeg',
        },
      ],
    });
    mockedCreateMedicine.mockResolvedValue({
      _id: 'm123',
      name: 'Paracetamol',
      category: 'Painkiller',
      price: 5,
      stockQuantity: 20,
      expiryDate: new Date().toISOString(),
      packagingImageUrl: '/uploads/paracetamol.jpg',
    });

    render(<AddMedicineScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('e.g. Amoxicillin'), 'Paracetamol');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Antibiotic'), 'Painkiller');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. 12.5'), '5');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. 100'), '20');

    fireEvent.press(screen.getByText('Capture Packaging Photo'));
    await screen.findByText('Retake Packaging Photo');

    fireEvent.press(screen.getByText('Save Medication'));

    await waitFor(() => {
      expect(mockedCreateMedicine).toHaveBeenCalledTimes(1);
      expect(mockedCreateMedicine.mock.calls[0][0]).toBeInstanceOf(FormData);
    });

    expect(alertSpy).toHaveBeenCalledWith(
      'Success',
      'Medication added successfully.',
      expect.any(Array),
    );
  });

  it('shows submit error feedback when API call fails', async () => {
    mockedUseAuth.mockReturnValue({ user: { role: 'admin' } });
    mockedRequestCameraPermissionsAsync.mockResolvedValue({ granted: true });
    mockedLaunchCameraAsync.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: 'file:///tmp/packaging.jpg',
          mimeType: 'image/jpeg',
        },
      ],
    });
    mockedCreateMedicine.mockRejectedValue(new Error('Upload failed'));

    render(<AddMedicineScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('e.g. Amoxicillin'), 'Amoxicillin');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Antibiotic'), 'Antibiotic');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. 12.5'), '10');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. 100'), '8');

    fireEvent.press(screen.getByText('Capture Packaging Photo'));
    await screen.findByText('Retake Packaging Photo');

    fireEvent.press(screen.getByText('Save Medication'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Error', 'Upload failed');
    });
  });
});
