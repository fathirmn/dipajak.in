import * as XLSX from "xlsx";
import type { ExtractedInvoice } from "@/lib/schemas";
import type { CompanyProfile } from "@/lib/schemas";

export function exportSummaryToExcel(
  invoices: ExtractedInvoice[],
  seller: CompanyProfile
) {
  const wb = XLSX.utils.book_new();

  // ─── Sheet 1: Ringkasan Faktur ───────────────────────────────────────────────
  const summaryHeader = [
    ["RINGKASAN FAKTUR PAJAK", "", "", "", "", "", "", ""],
    [`Penjual: ${seller.name}`, "", "", "", "", "", "", ""],
    [`NPWP: ${seller.npwp}`, "", `Tanggal Export: ${new Date().toLocaleDateString("id-ID")}`, "", "", "", "", ""],
    [],
    [
      "No",
      "Nomor Referensi",
      "Tanggal Faktur",
      "Nama Pembeli",
      "NPWP Pembeli",
      "Kode Transaksi",
      "DPP (Rp)",
      "PPN (Rp)",
      "Total (Rp)",
    ],
  ];

  const summaryRows = invoices.map((inv, i) => [
    i + 1,
    inv.invoiceNumber,
    inv.invoiceDate,
    inv.buyerName,
    inv.buyerNpwp || "-",
    inv.trxCode,
    inv.subtotal,
    inv.totalVat,
    inv.grandTotal,
  ]);

  // Totals row
  const totalsRow = [
    "",
    "",
    "",
    "",
    "TOTAL",
    "",
    invoices.reduce((s, i) => s + i.subtotal, 0),
    invoices.reduce((s, i) => s + i.totalVat, 0),
    invoices.reduce((s, i) => s + i.grandTotal, 0),
  ];

  const summaryData = [...summaryHeader, ...summaryRows, [], totalsRow];
  const ws1 = XLSX.utils.aoa_to_sheet(summaryData);

  // Column widths
  ws1["!cols"] = [
    { wch: 5 },  // No
    { wch: 28 }, // Nomor Referensi
    { wch: 14 }, // Tanggal
    { wch: 35 }, // Nama Pembeli
    { wch: 18 }, // NPWP
    { wch: 10 }, // Kode
    { wch: 18 }, // DPP
    { wch: 18 }, // PPN
    { wch: 18 }, // Total
  ];

  XLSX.utils.book_append_sheet(wb, ws1, "Ringkasan");

  // ─── Sheet 2: Detail Item ────────────────────────────────────────────────────
  const detailHeader = [
    [
      "No Faktur",
      "Tanggal",
      "Pembeli",
      "NPWP Pembeli",
      "Nama Barang/Jasa",
      "Jenis",
      "Satuan",
      "Kode Satuan",
      "Qty",
      "Harga Satuan (Rp)",
      "Diskon (Rp)",
      "DPP (Rp)",
      "PPN (Rp)",
    ],
  ];

  const detailRows: (string | number)[][] = [];
  invoices.forEach((inv) => {
    inv.items.forEach((item) => {
      detailRows.push([
        inv.invoiceNumber,
        inv.invoiceDate,
        inv.buyerName,
        inv.buyerNpwp || "-",
        item.name,
        item.opt === "A" ? "Barang" : "Jasa",
        item.unit,
        item.unitCode,
        item.quantity,
        item.unitPrice,
        item.discount || 0,
        item.taxBase,
        item.vat,
      ]);
    });
  });

  const ws2 = XLSX.utils.aoa_to_sheet([...detailHeader, ...detailRows]);
  ws2["!cols"] = [
    { wch: 28 }, { wch: 14 }, { wch: 30 }, { wch: 18 },
    { wch: 35 }, { wch: 8 }, { wch: 12 }, { wch: 10 },
    { wch: 6 }, { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 14 },
  ];

  XLSX.utils.book_append_sheet(wb, ws2, "Detail Item");

  // ─── Download ────────────────────────────────────────────────────────────────
  const filename = `ringkasan_faktur_${new Date().toISOString().split("T")[0]}.xlsx`;
  XLSX.writeFile(wb, filename);
}
