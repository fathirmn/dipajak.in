"use client";

import { FileText, FileSpreadsheet, Image as ImageIcon, Loader2 } from "lucide-react";

interface PreviewCardProps {
  file: File | null;
  previewUrl: string | null;
  isLoading?: boolean;
}

export function PreviewCard({ file, previewUrl, isLoading }: PreviewCardProps) {
  const isImage = file?.type.startsWith("image/");
  const isPdf = file?.type === "application/pdf";
  const isExcel =
    file?.type.includes("spreadsheet") ||
    file?.type.includes("excel") ||
    file?.name.endsWith(".xlsx") ||
    file?.name.endsWith(".xls");

  return (
    <div className="bg-[#1C1C1F] border border-[rgba(168,162,158,0.1)] p-6">
      <h3 className="text-xs uppercase tracking-[0.05em] font-medium text-[#78716C] mb-4 flex items-center gap-2">
        <FileText className="w-4 h-4" />
        Preview
      </h3>

      <div className="aspect-[3/4] bg-[#0A0A0B] border border-[rgba(168,162,158,0.1)] overflow-hidden flex items-center justify-center relative">
        {isLoading && (
          <div className="absolute inset-0 bg-[#0A0A0B]/90 flex flex-col items-center justify-center gap-3 z-10">
            <Loader2 className="w-6 h-6 text-[#D97706] animate-spin" />
            <span className="text-xs text-[#D97706]">Extracting...</span>
          </div>
        )}

        {!file && !isLoading && (
          <div className="text-[#78716C] flex flex-col items-center gap-3">
            <ImageIcon className="w-10 h-10 stroke-[1.5]" />
            <span className="text-xs">No file</span>
          </div>
        )}

        {file && isImage && previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="Invoice preview"
            className="w-full h-full object-contain"
          />
        )}

        {file && isPdf && (
          <div className="flex flex-col items-center gap-3 text-[#A8A29E]">
            <FileText className="w-12 h-12 stroke-[1.5]" />
            <span className="text-xs font-medium max-w-[120px] truncate">{file.name}</span>
            <span className="text-[11px] text-[#78716C]">PDF</span>
          </div>
        )}

        {file && isExcel && (
          <div className="flex flex-col items-center gap-3 text-[#A8A29E]">
            <FileSpreadsheet className="w-12 h-12 stroke-[1.5] text-[#059669]" />
            <span className="text-xs font-medium max-w-[120px] truncate">{file.name}</span>
            <span className="text-[11px] text-[#78716C]">Excel</span>
          </div>
        )}
      </div>

      {file && (
        <p
          className="mt-3 text-[11px] text-[#78716C] truncate"
          style={{ fontFamily: "var(--font-jetbrains)" }}
        >
          {(file.size / 1024).toFixed(1)} KB
        </p>
      )}
    </div>
  );
}
