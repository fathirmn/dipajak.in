import { z } from "zod";

export const InvoiceItemSchema = z.object({
  name: z.string(),
  code: z.string().default("000000"),
  unit: z.string().default("Unit"),
  unitCode: z.string().default("UM.0018"),
  opt: z.string().default("A"),
  quantity: z.number(),
  unitPrice: z.number(),
  discount: z.number().default(0),
  taxBase: z.number(),
  vatRate: z.number().default(12),
  vat: z.number(),
});

export const ExtractedInvoiceSchema = z.object({
  invoiceNumber: z.string(),
  invoiceDate: z.string(),
  buyerName: z.string(),
  buyerNpwp: z.string().optional().default(""),
  buyerAddress: z.string().default(""),
  buyerEmail: z.string().optional().default(""),
  originalVatRate: z.number().default(11),
  trxCode: z.string().default("04"),
  additionalInfo: z.string().default(""),
  supportingDocument: z.string().default(""),
  supportingDocumentPeriod: z.string().default(""),
  facilityStamp: z.string().default(""),
  buyerDocumentType: z.string().default("TIN"),
  buyerCountry: z.string().default("IDN"),
  buyerDocumentNumber: z.string().default("-"),
  mosValue: z.number().optional().default(0), // Memo of Sales - invoice-level discount
  items: z.array(InvoiceItemSchema),
  subtotal: z.number(),
  totalVat: z.number(),
  grandTotal: z.number(),
});

export const CompanyProfileSchema = z.object({
  name: z.string(),
  npwp: z.string().length(16),
  idtku: z.string().length(22),
  address: z.string(),
  email: z.string().email().optional(),
});

export type InvoiceItem = z.infer<typeof InvoiceItemSchema>;
export type ExtractedInvoice = z.infer<typeof ExtractedInvoiceSchema>;
export type CompanyProfile = z.infer<typeof CompanyProfileSchema>;

export const invoiceJsonSchema = {
  type: "object",
  properties: {
    invoiceNumber: { type: "string", description: "Invoice number/ID" },
    invoiceDate: { type: "string", description: "Invoice date in YYYY-MM-DD format" },
    buyerName: { type: "string", description: "Buyer/customer company name" },
    buyerNpwp: { type: "string", description: "Buyer NPWP (16 digits, pad with leading zeros if needed)" },
    buyerAddress: { type: "string", description: "Buyer address" },
    buyerEmail: { type: "string", description: "Buyer email if visible" },
    originalVatRate: { type: "number", description: "Original VAT/PPN rate from invoice (11 or 12)" },
    trxCode: { type: "string", description: "Coretax transaction code (default 04 DPP Nilai Lain)" },
    additionalInfo: { type: "string", description: "Keterangan Tambahan / AddInfo" },
    supportingDocument: { type: "string", description: "Dokumen Pendukung / CustomDoc" },
    supportingDocumentPeriod: { type: "string", description: "Period Dok Pendukung (MMYYYY)" },
    facilityStamp: { type: "string", description: "Cap Fasilitas (mandatory for trx 07/08)" },
    buyerDocumentType: { type: "string", description: "TIN or NIK" },
    buyerCountry: { type: "string", description: "Buyer country code (IDN)" },
    buyerDocumentNumber: { type: "string", description: "Buyer document number, '-' if TIN" },
    mosValue: { type: "number", description: "Memo of Sales (MOS) value - invoice-level discount that becomes the adjusted DPP. If MOS line exists, this is the discounted taxable base. 0 if no MOS." },
    items: {
      type: "array",
      description: "List of invoice line items",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Item/product name" },
          unit: { type: "string", description: "Original unit from invoice (e.g. Kg, Ton, Pcs)" },
          unitCode: { type: "string", description: "Coretax unit code (e.g. UM.0003 for Kg, UM.0018 for Unit)" },
          opt: { type: "string", description: "Barang/Jasa flag A=Barang B=Jasa" },
          quantity: { type: "number", description: "Quantity" },
          unitPrice: { type: "number", description: "Price per unit (whole number)" },
          discount: { type: "number", description: "Discount amount" },
          taxBase: { type: "number", description: "Tax base = unitPrice * quantity - discount" },
          vat: { type: "number", description: "VAT = taxBase * originalVatRate / 100" },
        },
        required: ["name", "unit", "unitCode", "opt", "quantity", "unitPrice", "discount", "taxBase", "vat"],
        additionalProperties: false,
      },
    },
    subtotal: { type: "number", description: "Subtotal = sum of all taxBase" },
    totalVat: { type: "number", description: "Total VAT = sum of all vat" },
    grandTotal: { type: "number", description: "Grand total = subtotal + totalVat" },
  },
  required: ["invoiceNumber", "invoiceDate", "buyerName", "buyerNpwp", "buyerAddress", "buyerEmail", "originalVatRate", "trxCode", "buyerDocumentType", "buyerCountry", "buyerDocumentNumber", "mosValue", "items", "subtotal", "totalVat", "grandTotal"],
  additionalProperties: false,
};
