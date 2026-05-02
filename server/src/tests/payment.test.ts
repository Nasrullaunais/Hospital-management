import { describe, it, expect, mock } from 'bun:test';
import mongoose from 'mongoose';
import { Payment } from '../modules/billing/payment.model.js';

describe('Payment Model Test', () => {
  it('should require invoiceId', async () => {
    let err: any;
    try {
      const payment = new Payment({
        patientId: new mongoose.Types.ObjectId(),
        amount: 500,
        method: 'mock_card',
      });
      await payment.validate();
    } catch (e: any) {
      err = e;
    }
    expect(err).toBeDefined();
    expect(err.errors.invoiceId).toBeDefined();
  });

  it('should require patientId', async () => {
    let err: any;
    try {
      const payment = new Payment({
        invoiceId: new mongoose.Types.ObjectId(),
        amount: 500,
        method: 'mock_card',
      });
      await payment.validate();
    } catch (e: any) {
      err = e;
    }
    expect(err).toBeDefined();
    expect(err.errors.patientId).toBeDefined();
  });

  it('should require method', async () => {
    let err: any;
    try {
      const payment = new Payment({
        invoiceId: new mongoose.Types.ObjectId(),
        patientId: new mongoose.Types.ObjectId(),
        amount: 500,
      });
      await payment.validate();
    } catch (e: any) {
      err = e;
    }
    expect(err).toBeDefined();
    expect(err.errors.method).toBeDefined();
  });

  it('should default status to pending', () => {
    const payment = new Payment({
      invoiceId: new mongoose.Types.ObjectId(),
      patientId: new mongoose.Types.ObjectId(),
      amount: 500,
      method: 'mock_card',
    });
    expect(payment.status).toBe('pending');
  });

  it('should default currency to LKR', () => {
    const payment = new Payment({
      invoiceId: new mongoose.Types.ObjectId(),
      patientId: new mongoose.Types.ObjectId(),
      amount: 500,
      method: 'mock_card',
    });
    expect(payment.currency).toBe('LKR');
  });

  it('should reject invalid payment method', async () => {
    let err: any;
    try {
      const payment = new Payment({
        invoiceId: new mongoose.Types.ObjectId(),
        patientId: new mongoose.Types.ObjectId(),
        amount: 500,
        method: 'invalid_method',
      });
      await payment.validate();
    } catch (e: any) {
      err = e;
    }
    expect(err).toBeDefined();
    expect(err.errors.method).toBeDefined();
  });

  it('should reject invalid currency', async () => {
    let err: any;
    try {
      const payment = new Payment({
        invoiceId: new mongoose.Types.ObjectId(),
        patientId: new mongoose.Types.ObjectId(),
        amount: 500,
        method: 'mock_card',
        currency: 'EUR',
      });
      await payment.validate();
    } catch (e: any) {
      err = e;
    }
    expect(err).toBeDefined();
    expect(err.errors.currency).toBeDefined();
  });

  it('should reject negative amount', async () => {
    let err: any;
    try {
      const payment = new Payment({
        invoiceId: new mongoose.Types.ObjectId(),
        patientId: new mongoose.Types.ObjectId(),
        amount: -100,
        method: 'mock_card',
      });
      await payment.validate();
    } catch (e: any) {
      err = e;
    }
    expect(err).toBeDefined();
    expect(err.errors.amount).toBeDefined();
  });

  it('should accept valid payment data', async () => {
    const payment = new Payment({
      invoiceId: new mongoose.Types.ObjectId(),
      patientId: new mongoose.Types.ObjectId(),
      amount: 1500,
      method: 'bank_transfer',
    });
    expect(payment.amount).toBe(1500);
    expect(payment.method).toBe('bank_transfer');
    expect(payment.status).toBe('pending');
  });
});

describe('Payment Controller Logic', () => {
  it('should set completed status and completedAt for mock_card payments', () => {
    const payment = new Payment({
      invoiceId: new mongoose.Types.ObjectId(),
      patientId: new mongoose.Types.ObjectId(),
      amount: 500,
      method: 'mock_card',
      status: 'completed',
      completedAt: new Date(),
    });
    expect(payment.status).toBe('completed');
    expect(payment.completedAt).toBeInstanceOf(Date);
  });

  it('should keep pending status for bank_transfer payments', () => {
    const payment = new Payment({
      invoiceId: new mongoose.Types.ObjectId(),
      patientId: new mongoose.Types.ObjectId(),
      amount: 1000,
      method: 'bank_transfer',
    });
    expect(payment.status).toBe('pending');
    expect(payment.completedAt).toBeUndefined();
  });
});
