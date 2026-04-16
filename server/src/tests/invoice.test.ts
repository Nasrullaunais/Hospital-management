import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import mongoose from 'mongoose';
import { Invoice } from '../modules/billing/invoice.model.js';

describe('Invoice Model Test', () => {
  beforeAll(async () => {
    // connect to memory or simply mock if we just want to run unit tests
    // or test the schema validitiy
  });

  afterAll(async () => {
    // cleanup
  });

  it('should require a patientId', async () => {
    let err;
    try {
      const invoice = new Invoice({ totalAmount: 100 });
      await invoice.validate();
    } catch (e: any) {
      err = e;
    }
    expect(err).toBeDefined();
    expect(err.errors.patientId).toBeDefined();
  });

  it('should default paymentStatus to Unpaid', () => {
    const invoice = new Invoice({ patientId: new mongoose.Types.ObjectId(), totalAmount: 150 });
    expect(invoice.paymentStatus).toBe('Unpaid');
  });
});
