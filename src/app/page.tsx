"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/header";
import { UploadZone } from "@/components/upload-zone";
import { InvoiceList, type InvoiceFile } from "@/components/invoice-list";
import { CompanyModal, loadCompanyProfile } from "@/components/company-modal";
import { Button } from "@/components/ui/button";
import { Download, Loader2, AlertCircle } from "lucide-react";
import { imageToBase64, parseExcel, getFileType } from "@/lib/file-handlers";
import { generateBulkFakturPKXml, downloadXml } from "@/lib/xml-generator";
import type { ExtractedInvoice, CompanyProfile } from "@/lib/schemas";

export default function Home() {
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [invoiceFiles, setInvoiceFiles] = useState<InvoiceFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const profile = loadCompanyProfile();
    setCompanyProfile(profile);
    if (!profile) {
      setCompanyModalOpen(true);
    }
  }, []);

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
        throw new Error("Unsupported file type");
      }

      const response = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to parse invoice");
      }

      const data = await response.json();

      // The API already validates and processes the data (including MOS adjustment)
      // Just ensure defaults for any missing optional fields
      const processedData: ExtractedInvoice = {
        invoiceNumber: data.invoiceNumber || "UNKNOWN",
        invoiceDate: data.invoiceDate || new Date().toISOString().split("T")[0],
        buyerName: data.buyerName || "",
        buyerNpwp: data.buyerNpwp || "",
        buyerAddress: data.buyerAddress || "",
        buyerEmail: data.buyerEmail || "",
        originalVatRate: data.originalVatRate || 11,
        trxCode: data.trxCode || "04",
        additionalInfo: data.additionalInfo || "",
        supportingDocument: data.supportingDocument || "",
        supportingDocumentPeriod: data.supportingDocumentPeriod || "",
        facilityStamp: data.facilityStamp || "",
        buyerDocumentType: data.buyerDocumentType || "TIN",
        buyerCountry: data.buyerCountry || "IDN",
        buyerDocumentNumber: data.buyerDocumentNumber || "-",
        mosValue: data.mosValue || 0,
        items: data.items || [],
        subtotal: data.subtotal || 0,
        totalVat: data.totalVat || 0,
        grandTotal: data.grandTotal || 0,
      };

      return { ...invoiceFile, status: "done", data: processedData };
    } catch (err) {
      return {
        ...invoiceFile,
        status: "error",
        error: err instanceof Error ? err.message : "Failed to process",
      };
    }
  };

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
        prev.map((inv) =>
          inv.id === invoice.id ? { ...inv, status: "processing" } : inv
        )
      );

      const result = await processFile(invoice);

      setInvoiceFiles((prev) =>
        prev.map((inv) => (inv.id === invoice.id ? result : inv))
      );
    }

    setIsProcessing(false);
  }, []);

  const handleUpdateInvoice = useCallback((id: string, data: ExtractedInvoice) => {
    setInvoiceFiles((prev) =>
      prev.map((inv) => (inv.id === id ? { ...inv, data } : inv))
    );
  }, []);

  const handleRemoveInvoice = useCallback((id: string) => {
    setInvoiceFiles((prev) => prev.filter((inv) => inv.id !== id));
  }, []);

  const completedInvoices = invoiceFiles.filter(
    (inv) => inv.status === "done" && inv.data
  );

  const handleDownloadAll = () => {
    if (!companyProfile || completedInvoices.length === 0) return;

    const invoices = completedInvoices
      .map((inv) => inv.data)
      .filter((d): d is ExtractedInvoice => d !== null);

    const xml = generateBulkFakturPKXml({
      seller: companyProfile,
      invoices,
    });

    const filename = `faktur_pk_bulk_${new Date().toISOString().split("T")[0]}.xml`;
    downloadXml(xml, filename);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0A0A0B" }}>
      <Header onOpenSettings={() => setCompanyModalOpen(true)} />

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        <UploadZone onFilesSelect={handleFilesSelect} isLoading={isProcessing} />

        {invoiceFiles.length > 0 && (
          <InvoiceList
            invoices={invoiceFiles}
            onUpdateInvoice={handleUpdateInvoice}
            onRemoveInvoice={handleRemoveInvoice}
          />
        )}

        {completedInvoices.length > 0 && companyProfile && (
          <Button
            onClick={handleDownloadAll}
            disabled={isProcessing}
            size="xl"
            className="w-full disabled:bg-[#1C1C1F] disabled:text-[#78716C]"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Download className="w-5 h-5 mr-2" />
                Download {completedInvoices.length} Faktur XML
              </>
            )}
          </Button>
        )}

        {!companyProfile && invoiceFiles.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 bg-[rgba(217,119,6,0.1)] border border-[rgba(217,119,6,0.2)] text-[#D97706]">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">Set up your company profile to download XML</span>
          </div>
        )}
      </main>

      <CompanyModal
        open={companyModalOpen}
        onOpenChange={setCompanyModalOpen}
        profile={companyProfile}
        onSave={setCompanyProfile}
      />
    </div>
  );
}
