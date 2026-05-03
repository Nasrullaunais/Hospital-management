import { Invoice } from './invoice.model.js';
import { Dispense } from '../dispensing/dispense.model.js';

/**
 * Auto-linking service: matches unbilled dispensings to an invoice based
 * on medicine descriptions in the invoice's line items.
 */
export async function linkDispensingsToInvoice(
  invoice: InstanceType<typeof Invoice>,
): Promise<void> {
  const items = invoice.items;
  if (!items || items.length === 0) return;

  const medicineDescriptions = items
    .filter((item) => item.category === 'medicine')
    .map((item) => item.description.toLowerCase().replace(/^medicine:\s*/i, '').trim());

  if (medicineDescriptions.length === 0) return;

  const unbilledDispensings = await Dispense.find({
    patientId: invoice.patientId,
    invoiceId: null,
    status: { $in: ['fulfilled', 'partial'] },
  });

  for (const disp of unbilledDispensings) {
    const hasMatchingItem = disp.dispensedItems.some((di) =>
      medicineDescriptions.some(
        (desc) =>
          di.medicineName.toLowerCase().includes(desc) ||
          desc.includes(di.medicineName.toLowerCase()),
      ),
    );
    if (hasMatchingItem) {
      disp.invoiceId = invoice._id;
      await disp.save();
    }
  }
}
