"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Header } from "@/components/header";
import { UploadZone } from "@/components/upload-zone";
import { InvoiceList, type InvoiceFile } from "@/components/invoice-list";
import { CompanyModal, loadCompanyProfile } from "@/components/company-modal";
import { XmlPreviewModal } from "@/components/xml-preview-modal";
import { Button } from "@/components/ui/button";
import {
  Download, Loader2, AlertCircle, FileText, Cpu, ArrowRight,
  CheckCircle2, X, FileSpreadsheet, Eye,
} from "lucide-react";
import { imageToBase64, parseExcel, getFileType } from "@/lib/file-handlers";
import { generateBulkFakturPKXml, downloadXml } from "@/lib/xml-generator";
import { exportSummaryToExcel } from "@/lib/excel-export";
import type { ExtractedInvoice, CompanyProfile } from "@/lib/schemas";

const SESSION_KEY = "dipajak_session_invoices";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

interface ToastState {
  message: string;
  type: "success" | "error" | "info";
}

export default function Home() {
  const [companyModalOpen, setCompanyModalOpen]   = useState(false);
  const [companyProfile, setCompanyProfile]       = useState<CompanyProfile | null>(null);
  const [invoiceFiles, setInvoiceFiles]           = useState<InvoiceFile[]>([]);
  const [isProcessing, setIsProcessing]           = useState(false);
  const [toast, setToast]                         = useState<ToastState | null>(null);
  const [xmlPreview, setXmlPreview]               = useState<{ xml: string; filename: string } | null>(null);

  const invoiceFilesRef = useRef(invoiceFiles);
  useEffect(() => { invoiceFilesRef.current = invoiceFiles; }, [invoiceFiles]);

  // ── Restore from sessionStorage ──────────────────────────────────────────────
  useEffect(() => {
    const profile = loadCompanyProfile();
    setCompanyProfile(profile);
    if (!profile) setCompanyModalOpen(true);

    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        const parsed: InvoiceFile[] = JSON.parse(saved);
        // Restore only done invoices (file object can't be serialized)
        const restored = parsed.filter((i) => i.status === "done" && i.data);
        if (restored.length > 0) setInvoiceFiles(restored);
      }
    } catch { /* ignore */ }
  }, []);

  // ── Persist to sessionStorage on change ─────────────────────────────────────
  useEffect(() => {
    if (invoiceFiles.length === 0) return;
    try {
      // Only persist done invoices (file blobs can't be serialized)
      const toSave = invoiceFiles
        .filter((i) => i.status === "done")
        .map((i) => ({ ...i, file: { name: i.file.name, size: i.file.size, type: i.file.type } as unknown as File }));
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(toSave));
    } catch { /* ignore quota errors */ }
  }, [invoiceFiles]);

  // ── Keyboard shortcuts ───────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl/Cmd + D → Download XML
      if ((e.ctrlKey || e.metaKey) && e.key === "d") {
        e.preventDefault();
        if (!isProcessing && completedInvoices.length > 0 && companyProfile) handleDownloadAll();
      }
      // Ctrl/Cmd + P → Preview XML
      if ((e.ctrlKey || e.metaKey) && e.key === "p") {
        e.preventDefault();
        if (!isProcessing && completedInvoices.length > 0 && companyProfile) handlePreviewXml();
      }
      // Escape → close toast
      if (e.key === "Escape") setToast(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isProcessing, companyProfile, invoiceFiles]);

  // ── Toast ────────────────────────────────────────────────────────────────────
  const showToast = useCallback((message: string, type: ToastState["type"] = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ── Process single file ──────────────────────────────────────────────────────
  const processFile = async (invoiceFile: InvoiceFile): Promise<InvoiceFile> => {
    const file = invoiceFile.file;
    const fileType = getFileType(file);
    try {
      let requestBody: { imageBase64?: string; textContent?: string; fileType: string };
      if (fileType === "image") {
        const base64 = await imageToBase64(file);
        requestBody = { imageBase64: base64, fileType: "image" };
      } else if (fileType === "pdf") {
        const base64 = await imageToBase64(file);
        requestBody = { imageBase64: base64, fileType: "pdf" };
      } else if (fileType === "excel") {
        const buffer = await file.arrayBuffer();
        const csvText = parseExcel(buffer);
        requestBody = { textContent: csvText, fileType: "excel" };
      } else {
        throw new Error("Format file tidak didukung");
      }

      const response = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Gagal memproses faktur");
      }
      const data = await response.json();
      const processedData: ExtractedInvoice = {
        invoiceNumber:            data.invoiceNumber || "UNKNOWN",
        invoiceDate:              data.invoiceDate || new Date().toISOString().split("T")[0],
        buyerName:                data.buyerName || "",
        buyerNpwp:                data.buyerNpwp || "",
        buyerAddress:             data.buyerAddress || "",
        buyerEmail:               data.buyerEmail || "",
        originalVatRate:          data.originalVatRate || 12,
        trxCode:                  data.trxCode || "04",
        additionalInfo:           data.additionalInfo || "",
        supportingDocument:       data.supportingDocument || "",
        supportingDocumentPeriod: data.supportingDocumentPeriod || "",
        facilityStamp:            data.facilityStamp || "",
        buyerDocumentType:        data.buyerDocumentType || "TIN",
        buyerCountry:             data.buyerCountry || "IND",
        buyerDocumentNumber:      data.buyerDocumentNumber || "-",
        mosValue:                 data.mosValue || 0,
        retensiPct:               data.retensiPct || 0,
        items:                    data.items || [],
        subtotal:                 data.subtotal || 0,
        totalVat:                 data.totalVat || 0,
        grandTotal:               data.grandTotal || 0,
      };
      return { ...invoiceFile, status: "done", data: processedData };
    } catch (err) {
      return { ...invoiceFile, status: "error", error: err instanceof Error ? err.message : "Gagal memproses" };
    }
  };

  // ── Upload handler ───────────────────────────────────────────────────────────
  const handleFilesSelect = useCallback(async (files: File[]) => {
    const newInvoices: InvoiceFile[] = files.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      file,
      status: "pending" as const,
      data: null,
    }));
    setInvoiceFiles((prev) => [...prev, ...newInvoices]);
    setIsProcessing(true);

    for (const invoice of newInvoices) {
      setInvoiceFiles((prev) =>
        prev.map((inv) => inv.id === invoice.id ? { ...inv, status: "processing" } : inv)
      );
      const result = await processFile(invoice);
      setInvoiceFiles((prev) => prev.map((inv) => inv.id === invoice.id ? result : inv));
      if (result.status === "error") showToast(`Gagal: ${invoice.file.name}`, "error");
    }
    setIsProcessing(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showToast]);

  // ── Retry ────────────────────────────────────────────────────────────────────
  const handleRetryFile = useCallback(async (id: string) => {
    const invoiceFile = invoiceFilesRef.current.find((inv) => inv.id === id);
    if (!invoiceFile) return;
    setInvoiceFiles((prev) =>
      prev.map((inv) => inv.id === id ? { ...inv, status: "processing" as const, error: undefined, data: null } : inv)
    );
    const result = await processFile({ ...invoiceFile, status: "processing" as const });
    setInvoiceFiles((prev) => prev.map((inv) => inv.id === id ? result : inv));
    if (result.status === "done") showToast("Berhasil diproses ulang");
    else showToast(`Masih gagal: ${result.error}`, "error");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showToast]);

  // ── Duplicate ────────────────────────────────────────────────────────────────
  const handleDuplicateInvoice = useCallback((id: string) => {
    const original = invoiceFilesRef.current.find((inv) => inv.id === id);
    if (!original || !original.data) return;
    const duplicate: InvoiceFile = {
      ...original,
      id: `dup-${Date.now()}`,
      data: {
        ...original.data,
        invoiceNumber: `${original.data.invoiceNumber}-COPY`,
      },
    };
    setInvoiceFiles((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      const next = [...prev];
      next.splice(idx + 1, 0, duplicate);
      return next;
    });
    showToast("Faktur berhasil diduplikat");
  }, [showToast]);

  // ── Update / Remove / Clear ──────────────────────────────────────────────────
  const handleUpdateInvoice = useCallback((id: string, data: ExtractedInvoice) => {
    setInvoiceFiles((prev) => prev.map((inv) => inv.id === id ? { ...inv, data } : inv));
  }, []);

  const handleRemoveInvoice = useCallback((id: string) => {
    setInvoiceFiles((prev) => prev.filter((inv) => inv.id !== id));
  }, []);

  const handleClearAll = useCallback(() => {
    setInvoiceFiles([]);
    sessionStorage.removeItem(SESSION_KEY);
  }, []);

  // ── Stats ────────────────────────────────────────────────────────────────────
  const completedInvoices = invoiceFiles.filter((inv) => inv.status === "done" && inv.data);
  const errorInvoices     = invoiceFiles.filter((inv) => inv.status === "error");
  const totalDpp = completedInvoices.reduce((s, i) => s + (i.data?.subtotal  || 0), 0);
  const totalPpn = completedInvoices.reduce((s, i) => s + (i.data?.totalVat  || 0), 0);

  // ── XML helpers ──────────────────────────────────────────────────────────────
  const buildXml = () => {
    if (!companyProfile || completedInvoices.length === 0) return null;
    const invoices = completedInvoices.map((i) => i.data).filter((d): d is ExtractedInvoice => d !== null);
    return { xml: generateBulkFakturPKXml({ seller: companyProfile, invoices }), invoices };
  };

  const handlePreviewXml = () => {
    const result = buildXml();
    if (!result) return;
    const filename = `faktur_pk_bulk_${new Date().toISOString().split("T")[0]}.xml`;
    setXmlPreview({ xml: result.xml, filename });
  };

  const handleDownloadAll = () => {
    const result = buildXml();
    if (!result) return;
    const filename = `faktur_pk_bulk_${new Date().toISOString().split("T")[0]}.xml`;
    downloadXml(result.xml, filename);
    showToast(`${completedInvoices.length} faktur diunduh sebagai ${filename}`);
  };

  const handleExportExcel = () => {
    if (!companyProfile || completedInvoices.length === 0) return;
    const invoices = completedInvoices.map((i) => i.data).filter((d): d is ExtractedInvoice => d !== null);
    exportSummaryToExcel(invoices, companyProfile);
    showToast("Ringkasan Excel berhasil diunduh");
  };

  // ── Steps guide ──────────────────────────────────────────────────────────────
  const steps = [
    { icon: FileText,    step: "01", label: "Upload Faktur",  desc: "Seret & lepas faktur dalam format gambar, PDF, atau Excel" },
    { icon: Cpu,         step: "02", label: "AI Ekstrak Data", desc: "AI membaca dan mengekstrak data faktur secara otomatis" },
    { icon: Download,    step: "03", label: "Download XML",    desc: "Unduh XML Coretax siap upload ke e-Faktur DJP" },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0A0A0B" }}>
      <Header onOpenSettings={() => setCompanyModalOpen(true)} companyName={companyProfile?.name} />

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-10 space-y-6">
        <UploadZone onFilesSelect={handleFilesSelect} isLoading={isProcessing} />

        {/* Hero */}
        {invoiceFiles.length === 0 && (
          <div className="border border-[rgba(168,162,158,0.08)] bg-[#1C1C1F]">
            <div className="px-8 pt-8 pb-6 text-center space-y-3 border-b border-[rgba(168,162,158,0.08)]">
              <h2 className="text-2xl text-[#F5F5F4] tracking-[-0.02em]" style={{ fontFamily: "var(--font-dm-serif)" }}>
                Otomatisasi e-Faktur Coretax
              </h2>
              <p className="text-[#78716C] text-sm max-w-md mx-auto leading-relaxed">
                Upload faktur pajak dalam format apapun — AI kami akan mengekstrak data dan
                menghasilkan file XML siap upload ke sistem Coretax DJP.
              </p>
            </div>
            <div className="grid grid-cols-3 divide-x divide-[rgba(168,162,158,0.08)]">
              {steps.map(({ icon: Icon, step, label, desc }) => (
                <div key={step} className="p-6 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#D97706] uppercase tracking-[0.1em] font-medium">{step}</span>
                    <ArrowRight className="w-3 h-3 text-[rgba(168,162,158,0.25)]" />
                    <Icon className="w-3.5 h-3.5 text-[#78716C]" />
                  </div>
                  <h3 className="text-[#F5F5F4] text-sm font-medium">{label}</h3>
                  <p className="text-[#78716C] text-xs leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
            {/* Keyboard shortcuts hint */}
            <div className="px-8 py-3 border-t border-[rgba(168,162,158,0.08)] flex items-center gap-4">
              <span className="text-[10px] text-[#57534E] uppercase tracking-[0.06em]">Shortcut:</span>
              <span className="text-[10px] text-[#57534E]"><kbd className="px-1 py-0.5 border border-[rgba(168,162,158,0.2)] text-[#78716C]">Ctrl+D</kbd> Download XML</span>
              <span className="text-[10px] text-[#57534E]"><kbd className="px-1 py-0.5 border border-[rgba(168,162,158,0.2)] text-[#78716C]">Ctrl+P</kbd> Preview XML</span>
              <span className="text-[10px] text-[#57534E]"><kbd className="px-1 py-0.5 border border-[rgba(168,162,158,0.2)] text-[#78716C]">Esc</kbd> Tutup notifikasi</span>
            </div>
          </div>
        )}

        {invoiceFiles.length > 0 && (
          <InvoiceList
            invoices={invoiceFiles}
            onUpdateInvoice={handleUpdateInvoice}
            onRemoveInvoice={handleRemoveInvoice}
            onRetryFile={handleRetryFile}
            onClearAll={handleClearAll}
            onDuplicateInvoice={handleDuplicateInvoice}
          />
        )}

        {completedInvoices.length > 0 && companyProfile && (
          <>
            {/* Stats strip — Step 7: tambah kolom error */}
            <div className={`grid border border-[rgba(168,162,158,0.1)] divide-x divide-[rgba(168,162,158,0.1)] ${errorInvoices.length > 0 ? "grid-cols-4" : "grid-cols-3"}`}>
              <div className="px-6 py-4">
                <p className="text-[10px] uppercase tracking-[0.08em] text-[#78716C] mb-1.5">Total Faktur</p>
                <p className="text-2xl font-semibold text-[#F5F5F4]" style={{ fontFamily: "var(--font-jetbrains)" }}>
                  {completedInvoices.length}
                </p>
              </div>
              <div className="px-6 py-4">
                <p className="text-[10px] uppercase tracking-[0.08em] text-[#78716C] mb-1.5">Total DPP</p>
                <p className="text-lg font-semibold text-[#A8A29E] truncate" style={{ fontFamily: "var(--font-jetbrains)" }}>
                  Rp {formatCurrency(totalDpp)}
                </p>
              </div>
              <div className="px-6 py-4">
                <p className="text-[10px] uppercase tracking-[0.08em] text-[#78716C] mb-1.5">Total PPN</p>
                <p className="text-lg font-semibold text-[#D97706] truncate" style={{ fontFamily: "var(--font-jetbrains)" }}>
                  Rp {formatCurrency(totalPpn)}
                </p>
              </div>
              {errorInvoices.length > 0 && (
                <div className="px-6 py-4">
                  <p className="text-[10px] uppercase tracking-[0.08em] text-[#DC2626] mb-1.5">Gagal</p>
                  <p className="text-2xl font-semibold text-[#DC2626]" style={{ fontFamily: "var(--font-jetbrains)" }}>
                    {errorInvoices.length}
                  </p>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              {/* Preview XML */}
              <Button
                onClick={handlePreviewXml}
                disabled={isProcessing}
                variant="outline"
                size="xl"
                className="flex-1 border-[rgba(168,162,158,0.2)] text-[#A8A29E] hover:border-[rgba(217,119,6,0.4)] hover:text-[#D97706]"
                title="Ctrl+P"
              >
                <Eye className="w-5 h-5 mr-2" />
                Preview XML
              </Button>

              {/* Export Excel */}
              <Button
                onClick={handleExportExcel}
                disabled={isProcessing}
                variant="outline"
                size="xl"
                className="flex-1 border-[rgba(168,162,158,0.2)] text-[#A8A29E] hover:border-[rgba(5,150,105,0.4)] hover:text-[#059669]"
              >
                <FileSpreadsheet className="w-5 h-5 mr-2" />
                Export Excel
              </Button>

              {/* Download XML */}
              <Button
                onClick={handleDownloadAll}
                disabled={isProcessing}
                size="xl"
                className="flex-[2] disabled:bg-[#1C1C1F] disabled:text-[#78716C]"
                title="Ctrl+D"
              >
                {isProcessing ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Memproses...</>
                ) : (
                  <><Download className="w-5 h-5 mr-2" />Download {completedInvoices.length} Faktur XML</>
                )}
              </Button>
            </div>
          </>
        )}

        {!companyProfile && invoiceFiles.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 bg-[rgba(217,119,6,0.1)] border border-[rgba(217,119,6,0.2)] text-[#D97706]">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">Lengkapi profil perusahaan untuk mengunduh XML</span>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[rgba(168,162,158,0.07)] mt-8">
        <div className="max-w-4xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-[11px] text-[#78716C]">
            © {new Date().getFullYear()} <span className="text-[#A8A29E]">dipajak.in</span> — Alat bantu pembuatan Faktur Pajak Coretax
          </p>
          <p className="text-[11px] text-[#78716C]">Bukan produk resmi Direktorat Jenderal Pajak</p>
        </div>
      </footer>

      {/* Modals */}
      <CompanyModal
        open={companyModalOpen}
        onOpenChange={setCompanyModalOpen}
        profile={companyProfile}
        onSave={setCompanyProfile}
      />

      {xmlPreview && (
        <XmlPreviewModal
          open={!!xmlPreview}
          onOpenChange={(o) => !o && setXmlPreview(null)}
          xml={xmlPreview.xml}
          filename={xmlPreview.filename}
          onDownload={handleDownloadAll}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 border text-sm shadow-lg max-w-sm ${
          toast.type === "success" ? "bg-[#0A0A0B] border-[rgba(5,150,105,0.4)] text-[#059669]"
          : toast.type === "error" ? "bg-[#0A0A0B] border-[rgba(220,38,38,0.4)] text-[#DC2626]"
          : "bg-[#0A0A0B] border-[rgba(168,162,158,0.2)] text-[#A8A29E]"
        }`}>
          {toast.type === "success" && <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
          {toast.type === "error"   && <AlertCircle  className="w-4 h-4 flex-shrink-0" />}
          <span className="flex-1">{toast.message}</span>
          <button onClick={() => setToast(null)} className="opacity-50 hover:opacity-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
