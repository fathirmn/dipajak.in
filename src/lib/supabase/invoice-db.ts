import type { ExtractedInvoice } from "@/lib/schemas";

// ─── camelCase → snake_case (untuk INSERT ke Supabase) ───────────────────────

export function invoiceToRow(
  invoice: ExtractedInvoice,
  fileName: string,
  userId: string,
  sessionId: string
) {
  return {
    user_id:                    userId,
    session_id:                 sessionId,
    file_name:                  fileName,
    invoice_number:             invoice.invoiceNumber,
    invoice_date:               invoice.invoiceDate,
    buyer_name:                 invoice.buyerName,
    buyer_npwp:                 invoice.buyerNpwp ?? "",
    buyer_address:              invoice.buyerAddress,
    buyer_email:                invoice.buyerEmail ?? "",
    original_vat_rate:          invoice.originalVatRate,
    trx_code:                   invoice.trxCode,
    additional_info:            invoice.additionalInfo,
    supporting_document:        invoice.supportingDocument,
    supporting_document_period: invoice.supportingDocumentPeriod,
    facility_stamp:             invoice.facilityStamp,
    buyer_document_type:        invoice.buyerDocumentType,
    buyer_country:              invoice.buyerCountry,
    buyer_document_number:      invoice.buyerDocumentNumber,
    mos_value:                  invoice.mosValue ?? 0,
    retensi_pct:                invoice.retensiPct ?? 0,
    subtotal:                   invoice.subtotal,
    total_vat:                  invoice.totalVat,
    grand_total:                invoice.grandTotal,
    items:                      invoice.items,
  };
}

// ─── snake_case → camelCase (untuk membaca dari Supabase) ────────────────────

export function rowToInvoice(row: Record<string, unknown>): ExtractedInvoice {
  return {
    invoiceNumber:             row.invoice_number as string,
    invoiceDate:               row.invoice_date as string,
    buyerName:                 row.buyer_name as string,
    buyerNpwp:                 row.buyer_npwp as string,
    buyerAddress:              row.buyer_address as string,
    buyerEmail:                row.buyer_email as string,
    originalVatRate:           Number(row.original_vat_rate) as 11 | 12,
    trxCode:                   row.trx_code as string,
    additionalInfo:            row.additional_info as string,
    supportingDocument:        row.supporting_document as string,
    supportingDocumentPeriod:  row.supporting_document_period as string,
    facilityStamp:             row.facility_stamp as string,
    buyerDocumentType:         row.buyer_document_type as string,
    buyerCountry:              row.buyer_country as string,
    buyerDocumentNumber:       row.buyer_document_number as string,
    mosValue:                  Number(row.mos_value),
    retensiPct:                Number(row.retensi_pct),
    subtotal:                  Number(row.subtotal),
    totalVat:                  Number(row.total_vat),
    grandTotal:                Number(row.grand_total),
    items:                     row.items as ExtractedInvoice["items"],
  };
}
