"use client";

import { Button } from "@/components/ui/button";
import { Download, AlertCircle } from "lucide-react";
import type { ExtractedInvoice, CompanyProfile } from "@/lib/schemas";
import { generateFakturPKXml, downloadXml } from "@/lib/xml-generator";

interface DownloadButtonProps {
  invoice: ExtractedInvoice | null;
  company: CompanyProfile | null;
  disabled?: boolean;
}

export function DownloadButton({ invoice, company, disabled }: DownloadButtonProps) {
  const canDownload = invoice && company && company.npwp.length === 16;

  const handleDownload = () => {
    if (!invoice || !company) return;

    const xml = generateFakturPKXml({
      seller: company,
      invoice,
    });

    const filename = `faktur_pk_${invoice.invoiceNumber.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().split("T")[0]}.xml`;
    downloadXml(xml, filename);
  };

  if (!company || company.npwp.length !== 16) {
    return (
      <div className="flex items-center gap-2 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <p className="text-sm">Please set up your company profile first</p>
      </div>
    );
  }

  return (
    <Button
      onClick={handleDownload}
      disabled={!canDownload || disabled}
      className="w-full py-6 rounded-xl font-semibold text-lg
                 bg-gradient-to-r from-emerald-500 to-teal-500
                 hover:from-emerald-400 hover:to-teal-400
                 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed
                 transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200
                 shadow-lg shadow-emerald-500/25 disabled:shadow-none"
    >
      <Download className="w-5 h-5 mr-2" />
      Download Faktur PK XML
    </Button>
  );
}
