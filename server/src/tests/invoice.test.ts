import { describe, it, expect } from 'bun:test';
import mongoose from 'mongoose';
import { Invoice } from '../modules/billing/invoice.model.js';

describe('Invoice Model Test', () => {
  it('should require a patientId', async () => {
    let err: any;
    try {
      const invoice = new Invoice({ items: [{ description: 'Test', category: 'consultation', quantity: 1, unitPrice: 100 }] });
      await invoice.validate();
    } catch (e: any) {
      err = e;
    }
    expect(err).toBeDefined();
    expect(err.errors.patientId).toBeDefined();
  });

  it('should default paymentStatus to Unpaid', () => {
    const invoice = new Invoice({
      patientId: new mongoose.Types.ObjectId(),
      items: [{ description: 'Test', category: 'consultation', quantity: 1, unitPrice: 100 }],
    });
    expect(invoice.paymentStatus).toBe('Unpaid');
  });

  it('should require at least one item', async () => {
    let err: any;
    try {
      const invoice = new Invoice({ patientId: new mongoose.Types.ObjectId(), items: [] });
      await invoice.validate();
    } catch (e: any) {
      err = e;
    }
    expect(err).toBeDefined();
    expect(err.errors.items).toBeDefined();
  });

  it('should compute totalAmount virtual from items', () => {
    const invoice = new Invoice({
      patientId: new mongoose.Types.ObjectId(),
      items: [
        { description: 'Consultation fee', category: 'consultation', quantity: 1, unitPrice: 1500 },
        { description: 'Blood test', category: 'lab_test', quantity: 2, unitPrice: 500 },
      ],
    });
    expect(invoice.subtotal).toBe(2500);
    expect(invoice.totalAmount).toBe(2500);
  });

  it('should compute totalAmount with discount', () => {
    const invoice = new Invoice({
      patientId: new mongoose.Types.ObjectId(),
      items: [
        { description: 'Consultation fee', category: 'consultation', quantity: 1, unitPrice: 1500 },
      ],
      discount: 200,
    });
    expect(invoice.subtotal).toBe(1500);
    expect(invoice.totalAmount).toBe(1300);
  });

  it('should not allow negative totalAmount', () => {
    const invoice = new Invoice({
      patientId: new mongoose.Types.ObjectId(),
      items: [
        { description: 'Test', category: 'consultation', quantity: 1, unitPrice: 100 },
      ],
      discount: 500,
    });
    // totalAmount is capped at 0
    expect(invoice.totalAmount).toBe(0);
  });

  it('should default discount to 0', () => {
    const invoice = new Invoice({
      patientId: new mongoose.Types.ObjectId(),
      items: [{ description: 'Test', category: 'consultation', quantity: 1, unitPrice: 100 }],
    });
    expect(invoice.discount).toBe(0);
  });
});
