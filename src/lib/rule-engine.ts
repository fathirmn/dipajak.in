/**
 * Rule-Based Expert System (RBSE) untuk Validasi Faktur Pajak PPN
 *
 * Sistem pakar ini menggunakan kumpulan aturan IF-THEN untuk memeriksa
 * kesesuaian data faktur pajak dengan ketentuan PPN yang berlaku,
 * sesuai regulasi Coretax DJP.
 *
 * Referensi: PMK-131/2024, PER-03/PJ/2022, Coretax Template v1.6
 */

import type { ExtractedInvoice } from "@/lib/schemas";
import { TRANSACTION_CODES } from "@/lib/constants";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type RuleSeverity = "error" | "warning" | "info";

export type RuleCategory =
  | "identitas"
  | "transaksi"
  | "dpp_ppn"
  | "item"
  | "coretax";

export interface Rule {
  id: string;
  name: string;
  /** Deskripsi aturan dalam format IF ... THEN ... */
  description: string;
  category: RuleCategory;
  severity: RuleSeverity;
  /** Mengembalikan true jika aturan LULUS, false jika DILANGGAR */
  validate: (invoice: ExtractedInvoice) => boolean;
  message: (invoice: ExtractedInvoice) => string;
}

export interface RuleViolation {
  ruleId: string;
  ruleName: string;
  description: string;
  category: RuleCategory;
  severity: RuleSeverity;
  message: string;
}

export interface ValidationReport {
  invoiceNumber: string;
  violations: RuleViolation[];
  errorCount: number;
  warningCount: number;
  infoCount: number;
  /** true jika tidak ada violations dengan severity "error" */
  isValid: boolean;
  passedCount: number;
  totalRules: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Konstanta
// ─────────────────────────────────────────────────────────────────────────────

const VALID_VAT_RATES = [0, 11, 12];

/** Kode transaksi dengan PPN 0% (bebas / tidak dipungut) */
const TAX_FREE_CODES = ["07", "08"];

/** Kode transaksi yang memerlukan Pemungut PPN */
const PEMUNGUT_CODES = ["02", "03"];

const VALID_OPT_VALUES = ["A", "B"];

// ─────────────────────────────────────────────────────────────────────────────
// Definisi Aturan (Rules)
// ─────────────────────────────────────────────────────────────────────────────

export const RULES: Rule[] = [
  // ── Kategori: IDENTITAS ──────────────────────────────────────────────────

  {
    id: "R001",
    name: "Nama Pembeli Wajib",
    description:
      "IF nama pembeli kosong THEN error — nama pembeli wajib diisi pada setiap faktur pajak",
    category: "identitas",
    severity: "error",
    validate: (inv) =>
      Boolean(inv.buyerName && inv.buyerName.trim().length > 0),
    message: () => "Nama pembeli tidak boleh kosong",
  },

  {
    id: "R002",
    name: "NPWP Pembeli Wajib",
    description:
      "IF NPWP pembeli kosong THEN error — NPWP wajib diisi atau gunakan '0000000000000000' jika tidak ada",
    category: "identitas",
    severity: "error",
    validate: (inv) =>
      Boolean(inv.buyerNpwp && inv.buyerNpwp.trim().length > 0),
    message: () =>
      "NPWP pembeli tidak boleh kosong. Gunakan '0000000000000000' jika pembeli tidak ber-NPWP",
  },

  {
    id: "R003",
    name: "Format NPWP 16 Digit",
    description:
      "IF panjang NPWP ≠ 16 karakter THEN error — NPWP Coretax harus tepat 16 digit",
    category: "identitas",
    severity: "error",
    validate: (inv) => !inv.buyerNpwp || inv.buyerNpwp.length === 16,
    message: (inv) =>
      `NPWP harus tepat 16 digit (saat ini: ${inv.buyerNpwp?.length ?? 0} digit)`,
  },

  {
    id: "R004",
    name: "NPWP Hanya Angka",
    description:
      "IF NPWP mengandung karakter non-angka THEN error — NPWP tidak boleh mengandung tanda baca",
    category: "identitas",
    severity: "error",
    validate: (inv) => !inv.buyerNpwp || /^\d+$/.test(inv.buyerNpwp),
    message: () => "NPWP harus berisi angka saja (tanpa titik, strip, atau spasi)",
  },

  {
    id: "R005",
    name: "Email Pembeli Disarankan",
    description:
      "IF email pembeli kosong THEN info — email disarankan untuk notifikasi Coretax DJP namun tidak wajib",
    category: "identitas",
    severity: "info",
    validate: (inv) =>
      Boolean(inv.buyerEmail && inv.buyerEmail.trim().length > 0),
    message: () => "Email pembeli kosong. Disarankan diisi untuk notifikasi Coretax DJP",
  },

  {
    id: "R006",
    name: "Format Email Valid",
    description:
      "IF format email tidak mengandung '@' dan domain THEN warning — format email tidak sesuai standar",
    category: "identitas",
    severity: "warning",
    validate: (inv) =>
      !inv.buyerEmail ||
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inv.buyerEmail),
    message: (inv) => `Format email tidak valid: "${inv.buyerEmail}"`,
  },

  // ── Kategori: TRANSAKSI ──────────────────────────────────────────────────

  {
    id: "R007",
    name: "Nomor Faktur Wajib",
    description:
      "IF nomor faktur kosong atau bernilai 'UNKNOWN' THEN error — nomor faktur wajib ada dan teridentifikasi",
    category: "transaksi",
    severity: "error",
    validate: (inv) =>
      Boolean(
        inv.invoiceNumber &&
          inv.invoiceNumber !== "UNKNOWN" &&
          inv.invoiceNumber.trim().length > 0
      ),
    message: () =>
      "Nomor faktur tidak boleh kosong atau 'UNKNOWN'. Periksa kembali dokumen sumber",
  },

  {
    id: "R008",
    name: "Tanggal Faktur Wajib",
    description:
      "IF tanggal faktur kosong THEN error — tanggal penerbitan faktur wajib diisi",
    category: "transaksi",
    severity: "error",
    validate: (inv) =>
      Boolean(inv.invoiceDate && inv.invoiceDate.trim().length > 0),
    message: () => "Tanggal faktur tidak boleh kosong",
  },

  {
    id: "R009",
    name: "Tanggal Faktur Tidak Boleh Masa Depan",
    description:
      "IF tanggal faktur > tanggal hari ini THEN warning — faktur belum seharusnya diterbitkan",
    category: "transaksi",
    severity: "warning",
    validate: (inv) => {
      if (!inv.invoiceDate) return true;
      const invoiceDate = new Date(inv.invoiceDate);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      return invoiceDate <= today;
    },
    message: (inv) =>
      `Tanggal faktur (${inv.invoiceDate}) melebihi tanggal hari ini`,
  },

  {
    id: "R010",
    name: "Kode Transaksi Valid",
    description:
      "IF kode transaksi tidak termasuk dalam daftar 01–10 THEN error — kode transaksi tidak dikenali Coretax",
    category: "transaksi",
    severity: "error",
    validate: (inv) => Object.keys(TRANSACTION_CODES).includes(inv.trxCode),
    message: (inv) =>
      `Kode transaksi "${inv.trxCode}" tidak valid. Harus antara 01–10`,
  },

  {
    id: "R011",
    name: "Cap Fasilitas untuk Transaksi Bebas PPN",
    description:
      "IF kode transaksi = 07 atau 08 AND cap fasilitas kosong THEN warning — cap fasilitas wajib untuk transaksi PPN tidak dipungut/dibebaskan",
    category: "transaksi",
    severity: "warning",
    validate: (inv) => {
      if (!TAX_FREE_CODES.includes(inv.trxCode)) return true;
      return Boolean(inv.facilityStamp && inv.facilityStamp.trim().length > 0);
    },
    message: (inv) =>
      `Kode transaksi ${inv.trxCode} memerlukan pengisian Cap Fasilitas`,
  },

  // ── Kategori: DPP / PPN ──────────────────────────────────────────────────

  {
    id: "R012",
    name: "Total DPP Harus Positif",
    description:
      "IF total DPP ≤ 0 THEN error — Dasar Pengenaan Pajak tidak boleh nol atau negatif",
    category: "dpp_ppn",
    severity: "error",
    validate: (inv) => inv.subtotal > 0,
    message: (inv) =>
      `Total DPP harus lebih dari 0 (saat ini: ${inv.subtotal.toLocaleString("id-ID")})`,
  },

  {
    id: "R013",
    name: "Total PPN Harus Ada pada Transaksi Normal",
    description:
      "IF kode transaksi bukan 07/08 AND total PPN = 0 THEN warning — PPN seharusnya ada pada transaksi normal",
    category: "dpp_ppn",
    severity: "warning",
    validate: (inv) => {
      if (TAX_FREE_CODES.includes(inv.trxCode)) return true;
      return inv.totalVat > 0;
    },
    message: () =>
      "Total PPN bernilai 0 pada transaksi normal. Periksa perhitungan PPN",
  },

  {
    id: "R014",
    name: "Tarif PPN Valid",
    description:
      "IF tarif PPN tidak dalam [0, 11, 12] THEN error — tarif PPN yang berlaku adalah 0%, 11%, atau 12%",
    category: "dpp_ppn",
    severity: "error",
    validate: (inv) => VALID_VAT_RATES.includes(inv.originalVatRate),
    message: (inv) =>
      `Tarif PPN ${inv.originalVatRate}% tidak valid. Gunakan 0%, 11%, atau 12%`,
  },

  {
    id: "R015",
    name: "Konsistensi Grand Total",
    description:
      "IF |grandTotal - (subtotal + totalVat)| > 1 THEN warning — terdapat selisih pada perhitungan total",
    category: "dpp_ppn",
    severity: "warning",
    validate: (inv) =>
      Math.abs(inv.grandTotal - (inv.subtotal + inv.totalVat)) <= 1,
    message: (inv) =>
      `Grand total (${inv.grandTotal.toLocaleString("id-ID")}) tidak sama dengan DPP + PPN (${(inv.subtotal + inv.totalVat).toLocaleString("id-ID")})`,
  },

  // ── Kategori: ITEM ────────────────────────────────────────────────────────

  {
    id: "R016",
    name: "Minimal 1 Baris Item",
    description:
      "IF jumlah item = 0 THEN error — faktur pajak harus memiliki minimal satu baris item",
    category: "item",
    severity: "error",
    validate: (inv) => inv.items.length > 0,
    message: () => "Faktur harus memiliki minimal 1 baris item",
  },

  {
    id: "R017",
    name: "Nama Item Tidak Boleh Kosong",
    description:
      "IF ada item dengan nama/deskripsi kosong THEN error — setiap baris item wajib memiliki nama",
    category: "item",
    severity: "error",
    validate: (inv) =>
      inv.items.every((item) => item.name && item.name.trim().length > 0),
    message: (inv) => {
      const idx = inv.items.findIndex((item) => !item.name?.trim());
      return `Baris item ke-${idx + 1} tidak memiliki nama/deskripsi`;
    },
  },

  {
    id: "R018",
    name: "Kuantitas Item Harus Positif",
    description:
      "IF ada item dengan kuantitas ≤ 0 THEN error — kuantitas harus lebih dari nol",
    category: "item",
    severity: "error",
    validate: (inv) => inv.items.every((item) => item.quantity > 0),
    message: (inv) => {
      const idx = inv.items.findIndex((item) => item.quantity <= 0);
      return `Item "${inv.items[idx]?.name}" memiliki kuantitas ≤ 0`;
    },
  },

  {
    id: "R019",
    name: "DPP Item Tidak Boleh Negatif",
    description:
      "IF ada item dengan DPP < 0 THEN error — nilai DPP per baris tidak boleh negatif",
    category: "item",
    severity: "error",
    validate: (inv) => inv.items.every((item) => item.taxBase >= 0),
    message: (inv) => {
      const idx = inv.items.findIndex((item) => item.taxBase < 0);
      return `Item "${inv.items[idx]?.name}" memiliki DPP negatif`;
    },
  },

  // ── Kategori: CORETAX ────────────────────────────────────────────────────

  {
    id: "R020",
    name: "Flag Opt Barang/Jasa Valid",
    description:
      "IF nilai opt bukan 'A' (Barang) atau 'B' (Jasa) THEN error — flag opt wajib diisi sesuai jenis penyerahan",
    category: "coretax",
    severity: "error",
    validate: (inv) =>
      inv.items.every((item) => VALID_OPT_VALUES.includes(item.opt)),
    message: (inv) => {
      const idx = inv.items.findIndex(
        (item) => !VALID_OPT_VALUES.includes(item.opt)
      );
      return `Item "${inv.items[idx]?.name}": flag opt harus 'A' (Barang) atau 'B' (Jasa)`;
    },
  },

  {
    id: "R021",
    name: "Kode Satuan (Unit Code) Wajib Diisi",
    description:
      "IF unit code item tidak dimulai dengan 'UM.' THEN warning — kode satuan Coretax wajib sesuai format UM.xxxx",
    category: "coretax",
    severity: "warning",
    validate: (inv) =>
      inv.items.every((item) => item.unitCode?.startsWith("UM.")),
    message: (inv) => {
      const idx = inv.items.findIndex(
        (item) => !item.unitCode?.startsWith("UM.")
      );
      return `Item "${inv.items[idx]?.name}" tidak memiliki kode satuan Coretax (UM.xxxx)`;
    },
  },

  {
    id: "R022",
    name: "Pembeli Luar Negeri Gunakan NPWP Nol",
    description:
      "IF kode negara pembeli ≠ 'IND' AND NPWP ≠ '0000000000000000' THEN info — pembeli asing wajib menggunakan NPWP pengganti",
    category: "coretax",
    severity: "info",
    validate: (inv) => {
      if (inv.buyerCountry === "IND") return true;
      return inv.buyerNpwp === "0000000000000000";
    },
    message: () =>
      "Pembeli luar negeri harus menggunakan NPWP '0000000000000000'",
  },

  {
    id: "R023",
    name: "Dokumen Pendukung untuk Transaksi Pemungut",
    description:
      "IF kode transaksi = 02 atau 03 AND dokumen pendukung kosong THEN info — disarankan melampirkan nomor dokumen pemungut",
    category: "coretax",
    severity: "info",
    validate: (inv) => {
      if (!PEMUNGUT_CODES.includes(inv.trxCode)) return true;
      return Boolean(
        inv.supportingDocument && inv.supportingDocument.trim().length > 0
      );
    },
    message: () =>
      "Transaksi kode 02/03 (Pemungut PPN) disarankan mengisi Dokumen Pendukung",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Rule Engine Executor
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Menjalankan seluruh aturan terhadap satu faktur.
 * Mengembalikan laporan validasi lengkap.
 */
export function validateInvoice(invoice: ExtractedInvoice): ValidationReport {
  const violations: RuleViolation[] = [];

  for (const rule of RULES) {
    const passed = rule.validate(invoice);
    if (!passed) {
      violations.push({
        ruleId: rule.id,
        ruleName: rule.name,
        description: rule.description,
        category: rule.category,
        severity: rule.severity,
        message: rule.message(invoice),
      });
    }
  }

  const errorCount = violations.filter((v) => v.severity === "error").length;
  const warningCount = violations.filter(
    (v) => v.severity === "warning"
  ).length;
  const infoCount = violations.filter((v) => v.severity === "info").length;

  return {
    invoiceNumber: invoice.invoiceNumber,
    violations,
    errorCount,
    warningCount,
    infoCount,
    isValid: errorCount === 0,
    passedCount: RULES.length - violations.length,
    totalRules: RULES.length,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Label & Helper
// ─────────────────────────────────────────────────────────────────────────────

export const CATEGORY_LABELS: Record<RuleCategory, string> = {
  identitas: "Identitas Pembeli",
  transaksi: "Data Transaksi",
  dpp_ppn: "DPP & PPN",
  item: "Baris Item",
  coretax: "Spesifikasi Coretax",
};
