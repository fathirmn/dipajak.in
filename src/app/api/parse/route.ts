import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { ExtractedInvoiceSchema, type ExtractedInvoice } from "@/lib/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const openai = new OpenAI();

async function ensureNodePdfGlobals() {
  /**
   * pdfjs-dist >=5 relies on process.getBuiltinModule (added in Node 20.16).
   * Turbopack can stub this away, so we repatch it with a safe require-based shim.
   */
  const current = (process as any).getBuiltinModule;
  if (typeof current !== "function" || !(current as any).__pdfPatched) {
    const { createRequire } = await import("node:module");
    const nodeRequire = createRequire(process.cwd() + "/pdf-shim.js");

    const moduleShim = { createRequire: () => nodeRequire };
    const builtins: Record<string, any> = {
      module: moduleShim,
      fs: nodeRequire("fs"),
      path: nodeRequire("path"),
      url: nodeRequire("url"),
    };

    const patched = (name: string) => builtins[name] ?? null;
    (patched as any).__pdfPatched = true;
    (process as any).getBuiltinModule = patched;
  }
}

const CORETAX_SYSTEM_PROMPT = `You are an Indonesian tax invoice extractor for Coretax e-Faktur XML format (Template v1.6).

═══════════════════════════════════════════════════════════════════════════════
SECTION 1: OUTPUT SCHEMA
═══════════════════════════════════════════════════════════════════════════════

### Header Fields
- invoiceNumber: string (goes to RefDesc in XML)
- invoiceDate: string (YYYY-MM-DD format)
- buyerName: string
- buyerNpwp: string (16 digits if visible, else "")
- buyerAddress: string (if visible, else "")
- buyerEmail: string (if visible, else "")
- buyerDocumentType: string (TIN|National ID|Passport|Other ID, default "TIN")
- buyerCountry: string (3-letter ISO code, default "IND")
- buyerDocumentNumber: string ("-" if TIN, else ID number)

### Transaction Fields
- trxCode: string (01-10, default "04")
- additionalInfo: string (TD.005xx for trxCode 07/08, else "")
- facilityStamp: string (TD.011xx for trxCode 07/08, else "")
- supportingDocument: string (custom doc number, else "")
- supportingDocumentPeriod: string (MMYYYY format, else "")

### Line Items Array
items[]: {
  name: string,
  opt: string ("A"=Barang, "B"=Jasa),
  code: string (default "000000"),
  unit: string (original text e.g. "Kg"),
  unitCode: string (UM.xxxx),
  quantity: number,
  unitPrice: number (integer),
  discount: number (integer, 0 if none),
  taxBase: number (qty × unitPrice - discount),
  vatRate: number (11 or 12),
  vat: number (taxBase × vatRate / 100)
}

### Totals
- originalVatRate: number (11 or 12, default 11)
- subtotal: number (sum of taxBase)
- totalVat: number (sum of vat)
- grandTotal: number (subtotal + totalVat)

═══════════════════════════════════════════════════════════════════════════════
SECTION 2: BARANG/JASA (GOODS/SERVICES) DETECTION
═══════════════════════════════════════════════════════════════════════════════

opt = "A" (BARANG/GOODS): Physical products, materials, equipment, hardware, panels, cables, components
opt = "B" (JASA/SERVICES): Services, labor, fees, activities — ANYTHING that is NOT a physical product

CRITICAL RULE: If item name starts with "BIAYA" → ALWAYS opt="B" (Jasa), NO EXCEPTION.
CRITICAL RULE: If item name contains "TESTING", "COMMISSIONING", "INSTALASI", "PENGIRIMAN", "PEMASANGAN" → ALWAYS opt="B".

SERVICE KEYWORDS — if ANY of these appear in item name → opt="B":
biaya, fee, jasa, service, testing, commissioning, instalasi, installation,
pemasangan, assembly, pengiriman, delivery, transportasi, transport, freight,
konsultasi, consulting, maintenance, perawatan, perbaikan, repair,
pelatihan, training, sewa, rental, support, garansi, warranty, supervision,
supervisi, inspeksi, inspection, manajemen, management, administrasi,
tenaga kerja, labor, cleaning, security, handling, mobilisasi, demobilisasi

EXAMPLES (MUST follow exactly):
- "CUBICLE LBS 630A" → opt="A" (physical panel equipment)
- "PANEL LVMDP" → opt="A" (physical panel)
- "KABEL NYY" → opt="A" (physical cable)
- "BIAYA TESTING COMMISSIONING" → opt="B" (testing service)
- "BIAYA PENGIRIMAN PANEL" → opt="B" (delivery service)
- "BIAYA INSTALASI" → opt="B" (installation service)
- "BIAYA PEMASANGAN" → opt="B" (assembly service)
- "JASA KONSULTASI" → opt="B" (consulting service)
- "BIAYA TRANSPORTASI" → opt="B" (transport service)

DECISION LOGIC:
1. Does item name contain any SERVICE KEYWORD above? → opt="B"
2. Is it a physical/tangible product you can hold? → opt="A"
3. When in doubt: "BIAYA ..." prefix ALWAYS = opt="B"

═══════════════════════════════════════════════════════════════════════════════
SECTION 3: KODE TRANSAKSI (TRANSACTION CODES)
═══════════════════════════════════════════════════════════════════════════════

01 = Penyerahan kepada selain Pemungut PPN (regular B2B sales)
02 = Penyerahan kepada Pemungut PPN Instansi Pemerintah (govt agency)
03 = Penyerahan kepada Pemungut PPN selain Instansi Pemerintah (other collector)
04 = DPP Nilai Lain (DEFAULT - different tax base calculation)
05 = Besaran tertentu (fixed amount)
06 = Penyerahan kepada pemegang paspor luar negeri (foreign passport holder)
07 = Fasilitas PPN tidak dipungut/ditanggung pemerintah (VAT not collected)
08 = Fasilitas dibebaskan PPN (VAT exempted)
09 = Penyerahan aktiva yang tidak diperjualbelikan (asset transfer)
10 = Penyerahan lainnya (other)

TRANSACTION CODE SELECTION RULES (read carefully):

USE "01" when:
- Regular B2B sale to a private company (PT, CV, UD, Tbk) — standard invoice
- No special facility, no government buyer, no DPP Nilai Lain indicator
- Buyer is an ordinary Indonesian company with NPWP
- Invoice looks like a normal commercial transaction

USE "04" (DPP Nilai Lain) when:
- Invoice explicitly mentions "DPP Nilai Lain" or "Nilai Lain"
- Invoice involves retail/consumer goods where DPP base differs from selling price
- Mixed goods+services on a single invoice where total DPP differs from subtotal
- Agency/commission transactions
- Items are sold at prices that include non-taxable components

USE "02" when: buyer is a government institution (Kementerian, Dinas, BUMN pemungut)
USE "03" when: buyer is a non-government VAT collector (BUMN tertentu)
USE "07" when: invoice mentions "tidak dipungut PPN" or "PPN ditanggung pemerintah"
USE "08" when: invoice mentions "dibebaskan PPN" or "bebas PPN"

DEFAULT: Use "01" for regular B2B invoices. Use "04" only when there is clear evidence of DPP Nilai Lain.

═══════════════════════════════════════════════════════════════════════════════
SECTION 4: KETERANGAN TAMBAHAN (ADDITIONAL INFO) - FOR TRXCODE 07
═══════════════════════════════════════════════════════════════════════════════

Required when trxCode = "07". Match invoice context to code:

TD.00501 = Kawasan Bebas (Free Trade Zone)
TD.00502 = Tempat Penimbunan Berikat (Bonded Zone)
TD.00503 = Hibah dan Bantuan Luar Negeri (Foreign Aid)
TD.00504 = Avtur (Aviation Fuel)
TD.00505 = Lainnya (Others)
TD.00506 = Kontraktor Pertambangan Batubara Gen I (Coal Mining Contractor)
TD.00507 = BBM untuk Kapal Angkutan Laut LN (Fuel for Intl Ships)
TD.00508 = Jasa terkait alat angkutan tertentu (Transport Equipment Services)
TD.00509 = BKP Tertentu di KEK (Goods in Special Economic Zone)
TD.00510 = Anode slime (Strategic Goods)
TD.00511 = Alat angkutan tertentu (Specific Transport Equipment)
TD.00512 = Kontraktor Migas PP 27/2017 (Oil&Gas Contractor)
TD.00513 = Rumah Tapak/Rusun DTP 2025 (Housing Govt Subsidy 2025)
TD.00514 = Jasa Sewa Ruangan DTP 2021 (Rental Space Subsidy 2021)
TD.00515 = Penanganan COVID-19 PMK 239 (COVID-19 Response)
TD.00516 = Insentif Rumah PMK-103/2021 (Housing Incentive 2021)
TD.00517 = KEK PP 40/2021 (Special Economic Zone)
TD.00518 = Kawasan Bebas PP 41/2021 (Free Trade Zone)
TD.00519 = Rumah Tapak DTP 2022 (Housing Subsidy 2022)
TD.00520 = PPN DTP COVID-19 (VAT Subsidy COVID)
TD.00521 = Kontraktor Migas PP 53/2017 (Oil&Gas Contractor)
TD.00522 = Anode slime & emas butiran (Gold & Anode Slime)
TD.00523 = Kertas koran/majalah (Newspaper/Magazine)
TD.00524 = PPN DTP (General VAT Subsidy)
TD.00525 = BKP dan JKP tertentu (Specific Goods/Services)
TD.00526 = BKP/JKP di IKN (Goods/Services in New Capital)
TD.00527 = Kendaraan listrik (Electric Vehicles)
TD.00528 = Insentif Rumah Tapak DTP 2025 (Housing Incentive 2025)
TD.00529 = Kuda & perlengkapan DTP 2025 (Horses & Equipment)
TD.00530 = Bekal Operasi Khusus DTP 2025 (Special Operations Supplies)

═══════════════════════════════════════════════════════════════════════════════
SECTION 5: KETERANGAN TAMBAHAN (ADDITIONAL INFO) - FOR TRXCODE 08
═══════════════════════════════════════════════════════════════════════════════

Required when trxCode = "08". Match invoice context to code:

TD.00501 = BKP dan JKP Tertentu (Specific Goods/Services)
TD.00502 = BKP Strategis (Strategic Goods)
TD.00503 = Jasa Kebandarudaraan (Airport Services)
TD.00504 = Lainnya (Others)
TD.00505 = BKP Strategis PP 81/2015 (Strategic Goods)
TD.00506 = Jasa Kepelabuhan LN (Port Services for Intl Ships)
TD.00507 = Air Bersih (Clean Water)
TD.00508 = BKP Strategis PP 48/2020 (Strategic Goods)
TD.00509 = Perwakilan Negara Asing (Foreign Embassy)
TD.00510 = BKP dan JKP tertentu (Specific Goods/Services)

═══════════════════════════════════════════════════════════════════════════════
SECTION 6: CAP FASILITAS (FACILITY STAMP) - FOR TRXCODE 07
═══════════════════════════════════════════════════════════════════════════════

Required when trxCode = "07". Match invoice context to code:

TD.01101 = PPN Tidak Dipungut PP 10/2012
TD.01102 = PPN/PPnBM tidak dipungut (general)
TD.01103 = PPN dan PPnBM Tidak Dipungut
TD.01104 = PPN Tidak Dipungut PP 71/2012
TD.01105 = (Tidak ada Cap)
TD.01106 = PPN/PPnBM tidak dipungut PMK 194/2012
TD.01107 = PPN Tidak Dipungut PP 15/2015
TD.01108 = PPN Tidak Dipungut PP 69/2015
TD.01109 = PPN Tidak Dipungut PP 96/2015
TD.01110 = PPN Tidak Dipungut PP 106/2015
TD.01111 = PPN Tidak Dipungut PP 50/2019
TD.01112 = PPN/PPnBM Tidak Dipungut PP 27/2017
TD.01113 = PPN DTP PMK 13/2025
TD.01114 = PPN DTP PMK 102/2021
TD.01115 = PPN DTP PMK 239/2020
TD.01116 = Insentif PPN DTP PMK 103/2021
TD.01117 = PPN Tidak Dipungut PP 40/2021
TD.01118 = PPN Tidak Dipungut PP 41/2021
TD.01119 = PPN DTP PMK 6/2022
TD.01120 = PPN DTP PMK 226/2021
TD.01121 = PPN/PPnBM Tidak Dipungut PP 53/2017
TD.01122 = PPN tidak dipungut PP 70/2021
TD.01123 = PPN DTP PMK-125/2020
TD.01124 = (Tidak ada Cap)
TD.01125 = PPN tidak dipungut PP 49/2022
TD.01126 = PPN tidak dipungut PP 12/2023
TD.01127 = PPN DTP PMK 38/2023
TD.01128 = PPN DTP PMK 60/2025
TD.01129 = PPN DTP PMK 61/2025
TD.01130 = PPN DTP PMK 44/2025

═══════════════════════════════════════════════════════════════════════════════
SECTION 7: CAP FASILITAS (FACILITY STAMP) - FOR TRXCODE 08
═══════════════════════════════════════════════════════════════════════════════

Required when trxCode = "08". Match invoice context to code:

TD.01101 = PPN Dibebaskan PP 146/2000 & PP 38/2003
TD.01102 = PPN Dibebaskan PP 12/2001 & PP 31/2007
TD.01103 = PPN dibebaskan PP 28/2009
TD.01104 = (Tidak ada cap)
TD.01105 = PPN Dibebaskan PP 81/2015
TD.01106 = PPN Dibebaskan PP 74/2015
TD.01107 = (tanpa cap)
TD.01108 = PPN Dibebaskan PP 81/2015 & PP 48/2020
TD.01109 = PPN Dibebaskan PP 47/2020
TD.01110 = PPN Dibebaskan PP 49/2022

═══════════════════════════════════════════════════════════════════════════════
SECTION 8: SATUAN UKUR (UNIT OF MEASUREMENT)
═══════════════════════════════════════════════════════════════════════════════

Map invoice unit text to Coretax unit codes:

WEIGHT:
UM.0001 = Metrik Ton (ton, metric ton)
UM.0002 = Wet Ton
UM.0003 = Kilogram (kg, kilo)
UM.0004 = Gram (gr, g)
UM.0005 = Karat

VOLUME:
UM.0006 = Kiloliter (kl)
UM.0007 = Liter (ltr, l)
UM.0008 = Barrel (bbl)
UM.0009 = MMBTU
UM.0034 = Meter Kubik (m3, m³)

AREA:
UM.0011 = Sentimeter Kubik (cm3)
UM.0012 = Meter Persegi (m2, m²)
UM.0035 = Sentimeter Persegi (cm2)

LENGTH:
UM.0013 = Meter (m)
UM.0014 = Inci (inch)
UM.0015 = Sentimeter (cm)
UM.0016 = Yard

COUNT:
UM.0017 = Lusin (dozen)
UM.0018 = Unit (default for unclear)
UM.0019 = Set
UM.0020 = Lembar (sheet)
UM.0021 = Piece (pcs, pieces)
UM.0022 = Boks (box)
UM.0036 = Drum
UM.0037 = Karton (carton)
UM.0039 = Roll

TIME:
UM.0023 = Tahun (year)
UM.0024 = Bulan (month)
UM.0025 = Minggu (week)
UM.0026 = Hari (day)
UM.0027 = Jam (hour)
UM.0028 = Menit (minute)

OTHER:
UM.0010 = Ampere
UM.0029 = Persen (percent, %)
UM.0030 = Kegiatan (activity)
UM.0031 = Laporan (report)
UM.0032 = Bahan (material)
UM.0033 = Lainnya (others, services default)
UM.0038 = Kwh

DEFAULT: UM.0018 (Unit) for unclear units
FOR SERVICES (opt="B"): Use UM.0033 (Lainnya) if unit unclear

═══════════════════════════════════════════════════════════════════════════════
SECTION 9: BUYER ID TYPES
═══════════════════════════════════════════════════════════════════════════════

TIN = NPWP (Tax ID - 16 digits) - DEFAULT for Indonesian companies
National ID = NIK (ID Card - 16 digits)
Passport = Paspor (Passport number)
Other ID = Dokumen Lainnya (Other document)

If buyer has NPWP visible → buyerDocumentType = "TIN", buyerDocumentNumber = "-"
If buyer only has NIK → buyerDocumentType = "National ID", buyerDocumentNumber = NIK
If foreign buyer → buyerDocumentType = "Passport" or "Other ID", buyerCountry = appropriate code (NOT "IND" for Indonesia)

═══════════════════════════════════════════════════════════════════════════════
SECTION 10: COUNTRY CODES (COMMON)
═══════════════════════════════════════════════════════════════════════════════

IND = Indonesia (DEFAULT)
SGP = Singapore, MYS = Malaysia, THA = Thailand, VNM = Vietnam
CHN = China, JPN = Japan, KOR = South Korea, TWN = Taiwan, HKG = Hong Kong
USA = United States, GBR = United Kingdom, DEU = Germany, FRA = France
AUS = Australia, NZL = New Zealand, ARE = UAE, SAU = Saudi Arabia

═══════════════════════════════════════════════════════════════════════════════
SECTION 11: EXTRACTION RULES
═══════════════════════════════════════════════════════════════════════════════

NPWP FORMAT:
- Extract exactly 16 digits
- "08.505.402.2-061.800" → "0850540220618000"
- If not visible or unclear, return ""
- DO NOT fabricate NPWP

PRICE FORMAT (Indonesian):
- Dot (.) = thousands separator
- Comma (,) = decimal separator
- "64.750.000,00" = 64750000
- "14.300" = 14300
- Always return as integer (no decimals)

DATE FORMAT:
- Convert any format to YYYY-MM-DD
- "02/02/2025" → "2025-02-02"
- "2 Februari 2025" → "2025-02-02"

VAT RATE DETECTION:
- IMPORTANT: For DPP Nilai Lain invoices (most common), originalVatRate should be 11
- Even if invoice shows "PPN 12%", this is the CONVERTED rate
- The original rate is 11% which gets converted via DPP Nilai Lain formula
- Calculate: If PPN ÷ MOS ≈ 11%, rate = 11 (most common case)
- Calculate: If PPN ÷ DPP = 12% directly without conversion, rate = 12
- Default to 11 if unclear (this is correct for most Indonesian invoices)

CALCULATIONS:
- taxBase = quantity × unitPrice - discount
- vat = taxBase × vatRate ÷ 100
- subtotal = sum of all taxBase
- totalVat = sum of all vat
- grandTotal = subtotal + totalVat
- VERIFY: grandTotal should match invoice total

═══════════════════════════════════════════════════════════════════════════════
SECTION 12: SPECIAL CASES
═══════════════════════════════════════════════════════════════════════════════

DPP NILAI LAIN (trxCode = "04"):
When originalVatRate = 11%, the XML generator will calculate:
- OtherTaxBase = TaxBase × 11/12
- VAT = OtherTaxBase × 12%
You just extract the original values; conversion is handled by the system.

TAX-EXEMPT (trxCode = "07" or "08"):
- MUST provide additionalInfo (TD.005xx)
- MUST provide facilityStamp (TD.011xx)
- Match context to the appropriate codes from sections 4-7

FOREIGN BUYER:
- buyerNpwp = "" (empty)
- buyerDocumentType = "Passport" or "Other ID"
- buyerCountry = appropriate ISO code (not "IND")
- buyerDocumentNumber = passport/ID number

═══════════════════════════════════════════════════════════════════════════════
SECTION 13: MOS (MEMO OF SALES) HANDLING
═══════════════════════════════════════════════════════════════════════════════

MOS (Memo of Sales) is an invoice-level discount that reduces the taxable base.

When invoice shows:
- Sub Total: X (sum of line items at original prices)
- MOS: Y (where Y < X, this is the adjusted/discounted DPP)
- DPP Nilai Lain: Z (= Y × 11/12 for DPP Nilai Lain calculation)
- PPN 12%: W (= Z × 12% = Y × 11%)

Extraction rules:
- Extract items with their ORIGINAL prices (before MOS adjustment)
- Set mosValue = Y (the MOS amount shown on invoice)
- Set originalVatRate = 11 (IMPORTANT: even if invoice shows "PPN 12%")
- The system will automatically distribute the discount proportionally to items

Example:
  Sub Total: 109,200,000
  MOS: 89,360,000 → set mosValue = 89360000
  DPP Nilai Lain: 81,913,333 (system calculates this)
  PPN 12%: 9,829,600 (= MOS × 11% = 89,360,000 × 0.11)
  Total: 99,189,600 (= MOS + PPN = 89,360,000 + 9,829,600)

  For this invoice: originalVatRate = 11 (NOT 12!)

If no MOS line exists on invoice, set mosValue = 0.

═══════════════════════════════════════════════════════════════════════════════
SECTION 14: RETENSI (RETENTION) & DP (DOWN PAYMENT) HANDLING
═══════════════════════════════════════════════════════════════════════════════

PENAGIHAN RETENSI / RETENTION BILLING:
Invoice shows "PENAGIHAN RETENSI X%" or "RETENSI X%" or "Penagihan Termin X%"
- Items are listed at their FULL original contract prices
- The invoiced/billed amount = Subtotal × X%
- PPN is calculated on the retention amount only (Subtotal × X%)

EXAMPLE (Retensi 10%):
  Subtotal: 3,067,120,000  ← full value of all items at original prices
  Retensi 10%: 306,712,000  ← 10% of subtotal = the actual DPP being billed
  PPN 11%: 33,738,320       ← PPN on the retention amount (306,712,000 × 11%)
  Total: 340,450,320        ← Retensi + PPN

Extraction rules for Retensi invoices:
- Extract items with their ORIGINAL full unit prices (exactly as shown)
- Set retensiPct = 10 (the percentage number only, without %)
- Set subtotal = sum of original item taxBase (full prices, e.g. 3,067,120,000)
- Set totalVat = PPN amount from invoice (e.g. 33,738,320)
- Set grandTotal = as shown on invoice (e.g. 340,450,320)
- The system will automatically apply: taxBase per item = original × retensiPct/100

DP (DOWN PAYMENT) / UANG MUKA BILLING:
Invoice shows "DP X%" or "Uang Muka X%" or "Pembayaran Tahap 1 (X%)"
Same logic as Retensi — items at full price, billing = Subtotal × X%

EXAMPLE (DP 50%):
  Subtotal: 1,000,000,000
  DP 50%: 500,000,000
  PPN 11%: 55,000,000
  Total: 555,000,000

Extraction rules for DP invoices:
- Extract items with ORIGINAL full unit prices
- Set retensiPct = 50

IMPORTANT:
- retensiPct = 0 means full billing (no retention/DP reduction)
- If retensiPct > 0, the system handles taxBase reduction — you provide ORIGINAL prices
- Do NOT manually reduce unitPrice or taxBase when retensiPct > 0

═══════════════════════════════════════════════════════════════════════════════
CRITICAL REMINDERS
═══════════════════════════════════════════════════════════════════════════════

1. DO NOT fabricate buyerNpwp or buyerEmail if not clearly visible
2. All monetary values must be integers (no decimals)
3. Verify calculation: grandTotal ≈ subtotal + totalVat
4. For services (opt="B"), default unitCode to UM.0033 if unclear
5. For goods (opt="A"), default unitCode to UM.0018 if unclear
6. Default trxCode to "01" for regular B2B, "04" only when explicitly DPP Nilai Lain
7. Return empty string "" for optional fields not visible in invoice
8. If MOS line exists, extract mosValue; system handles discount distribution
9. If Retensi/DP line exists, extract retensiPct; system handles taxBase reduction`;

async function extractPdfText(pdfBase64: string): Promise<string> {
  try {
    const pdfBuffer = Buffer.from(pdfBase64, "base64");
    const pdf = (await import("pdf-parse/lib/pdf-parse.js")).default;
    const result = await pdf(pdfBuffer);
    return result.text;
  } catch (error) {
    console.error("PDF text extraction error:", error);
    return "";
  }
}

async function convertPdfToImages(pdfBase64: string): Promise<string[]> {
  try {
    await ensureNodePdfGlobals();

    // Provide DOM-related globals for pdfjs (used by pdf-to-img) in Node
    const canvasMod = await import("canvas");
    const { DOMMatrix, Path2D, ImageData } = canvasMod as any;
    if (!("DOMMatrix" in globalThis)) {
      // @ts-ignore
      globalThis.DOMMatrix = DOMMatrix;
    }
    if (!("Path2D" in globalThis)) {
      // @ts-ignore
      globalThis.Path2D = Path2D;
    }
    if (!("ImageData" in globalThis)) {
      // @ts-ignore
      globalThis.ImageData = ImageData;
    }

    const pdfBuffer = Buffer.from(pdfBase64, "base64");
    const { pdf } = await import("pdf-to-img");
    const images: string[] = [];

    // Reduced scale from 2 to 1.5 for faster processing
    const document = await pdf(pdfBuffer, { scale: 1.5 });
    for await (const page of document) {
      images.push(page.toString("base64"));
    }

    return images;
  } catch (error) {
    console.error("PDF to image conversion error:", error);
    return [];
  }
}

function validateAndFixResult(result: ExtractedInvoice): ExtractedInvoice {
  // Ensure required fields exist
  if (!result.invoiceNumber || result.invoiceNumber.trim() === "") {
    result.invoiceNumber = "UNKNOWN";
  }

  // Validate date format (YYYY-MM-DD)
  if (!result.invoiceDate || !/^\d{4}-\d{2}-\d{2}$/.test(result.invoiceDate)) {
    result.invoiceDate = new Date().toISOString().split("T")[0];
  }

  // Ensure items array exists
  if (!result.items || result.items.length === 0) {
    result.items = [];
  }

  // Recalculate totals for each item and fix if needed
  const vatRate = result.originalVatRate || 11;

  // First pass: ensure all numeric fields are valid and set defaults
  for (const item of result.items) {
    item.quantity = Number(item.quantity) || 0;
    item.unitPrice = Math.round(Number(item.unitPrice) || 0);
    item.discount = Math.round(Number(item.discount) || 0);
    item.vatRate = vatRate;

    // Default unit code if missing
    if (!item.unitCode) {
      item.unitCode = item.opt === "B" ? "UM.0033" : "UM.0018";
    }

    // Default opt if missing
    if (!item.opt) {
      item.opt = "A";
    }

    // Default code if missing
    if (!item.code) {
      item.code = "000000";
    }

    // Recalculate taxBase from original values
    const expectedTaxBase = item.quantity * item.unitPrice - item.discount;
    if (Math.abs(item.taxBase - expectedTaxBase) > 1) {
      item.taxBase = expectedTaxBase;
    }
  }

  // Calculate subtotal before any adjustment (sum of original taxBase)
  const originalSubtotal = result.items.reduce((sum, item) => sum + item.taxBase, 0);

  // Handle Retensi / DP (Down Payment) — apply percentage reduction to each item's taxBase
  const retensiPct = Number(result.retensiPct) || 0;
  if (retensiPct > 0 && retensiPct < 100) {
    for (const item of result.items) {
      item.taxBase = Math.round(item.taxBase * retensiPct / 100);
    }
  }

  // Handle MOS (Memo of Sales) - distribute discount proportionally to line items
  // (MOS is applied after retensi if both somehow exist)
  const mosValue = Number(result.mosValue) || 0;
  if (mosValue > 0 && originalSubtotal > mosValue) {
    // MOS is the discounted DPP, so we distribute the discount proportionally
    const discountRatio = mosValue / originalSubtotal;

    for (const item of result.items) {
      // Adjust taxBase proportionally based on MOS discount ratio
      item.taxBase = Math.round(item.taxBase * discountRatio);
    }
  }

  // Second pass: calculate VAT based on final taxBase (after MOS adjustment)
  // For trxCode "04" (DPP Nilai Lain): VAT = (taxBase × vatRate/12) × 12% = taxBase × vatRate%
  // This is because DPP Nilai Lain = taxBase × vatRate/12, then PPN = DPP Nilai Lain × 12%
  // Simplified: VAT = taxBase × (vatRate / 100)
  // Note: vatRate should be 11 for DPP Nilai Lain invoices (the original rate before conversion)
  for (const item of result.items) {
    item.vat = Math.round(item.taxBase * vatRate / 100);
  }

  // Recalculate totals (after MOS adjustment if applicable)
  const expectedSubtotal = result.items.reduce((sum, item) => sum + item.taxBase, 0);
  const expectedTotalVat = result.items.reduce((sum, item) => sum + item.vat, 0);
  const expectedGrandTotal = expectedSubtotal + expectedTotalVat;

  // Update totals
  result.subtotal = expectedSubtotal;
  result.totalVat = expectedTotalVat;
  result.grandTotal = expectedGrandTotal;

  // Ensure VAT rate is valid
  if (result.originalVatRate !== 11 && result.originalVatRate !== 12) {
    result.originalVatRate = 11;
  }

  // Default trxCode to "01" if missing or invalid
  if (!result.trxCode || !/^(0[1-9]|10)$/.test(result.trxCode)) {
    result.trxCode = "01";
  }

  // Default buyerDocumentType to "TIN"
  if (!result.buyerDocumentType) {
    result.buyerDocumentType = "TIN";
  }

  // Default buyerCountry to "IDN"
  if (!result.buyerCountry) {
    result.buyerCountry = "IND";
  }

  // Default buyerDocumentNumber to "-" for TIN
  if (!result.buyerDocumentNumber) {
    result.buyerDocumentNumber = "-";
  }

  return result;
}

// Content types for the Responses API
type InputTextContent = { type: "input_text"; text: string };
type InputImageContent = { type: "input_image"; image_url: string; detail: "low" | "high" | "auto" };
type InputContent = InputTextContent | InputImageContent;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, textContent, fileType } = body;

    if (!imageBase64 && !textContent) {
      return NextResponse.json(
        { error: "No content provided" },
        { status: 400 }
      );
    }

    // Build the input content for the API
    let messageContent: InputContent[];

    if (fileType === "excel" && textContent) {
      messageContent = [
        { type: "input_text", text: `Invoice data from spreadsheet:\n\n${textContent}` },
      ];
    } else if (fileType === "pdf" && imageBase64) {
      // Smart PDF processing: try text first, only use images if text is insufficient
      const pdfText = await extractPdfText(imageBase64);

      // If text extraction yields good content (> 200 chars), use text-only (faster)
      if (pdfText && pdfText.trim().length > 200) {
        messageContent = [
          { type: "input_text", text: `Invoice data extracted from PDF:\n\n${pdfText}` },
        ];
      } else {
        // Fall back to image conversion for scanned PDFs or poor text extraction
        const pdfImages = await convertPdfToImages(imageBase64);

        if (pdfImages.length === 0) {
          return NextResponse.json(
            { error: "Failed to process PDF. Please try uploading as an image instead." },
            { status: 400 }
          );
        }

        messageContent = pdfImages.map((img) => ({
          type: "input_image" as const,
          image_url: `data:image/png;base64,${img}`,
          detail: "high" as const,
        }));
      }
    } else if (imageBase64) {
      messageContent = [
        {
          type: "input_image",
          image_url: `data:image/jpeg;base64,${imageBase64}`,
          detail: "high" as const,
        },
      ];
    } else {
      return NextResponse.json(
        { error: "Invalid content type" },
        { status: 400 }
      );
    }

    // Use native OpenAI SDK with Responses API for GPT-5
    const response = await openai.responses.parse({
      model: "gpt-5-mini",
      instructions: CORETAX_SYSTEM_PROMPT,
      input: [
        {
          role: "user",
          content: messageContent as OpenAI.Responses.ResponseInputContent[],
        },
      ],
      text: {
        format: zodTextFormat(ExtractedInvoiceSchema, "invoice"),
      },
    });

    // Extract the parsed output
    const result = response.output_parsed;

    if (!result) {
      throw new Error("Failed to parse invoice - no structured output returned");
    }

    // Validate and fix the result before returning
    const validatedResult = validateAndFixResult(result as ExtractedInvoice);

    return NextResponse.json(validatedResult);
  } catch (error) {
    console.error("Parse error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to parse invoice" },
      { status: 500 }
    );
  }
}
