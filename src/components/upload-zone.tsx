"use client";

import { useCallback, useState } from "react";
import { Upload, FileSpreadsheet, FileImage, FileText } from "lucide-react";

interface UploadZoneProps {
  onFilesSelect: (files: File[]) => void;
  isLoading?: boolean;
  maxFiles?: number;
}

export function UploadZone({ onFilesSelect, isLoading, maxFiles = 10 }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files).slice(0, maxFiles);
      if (files.length > 0) {
        onFilesSelect(files);
      }
    },
    [onFilesSelect, maxFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []).slice(0, maxFiles);
      if (files.length > 0) {
        onFilesSelect(files);
      }
      e.target.value = "";
    },
    [onFilesSelect, maxFiles]
  );

  return (
    <div className="bg-[#1C1C1F] border border-[rgba(168,162,158,0.1)] p-6">
      <h3 className="text-xs uppercase tracking-[0.05em] font-medium text-[#78716C] mb-6 flex items-center gap-2">
        <Upload className="w-4 h-4" />
        Upload Invoice
      </h3>

      <label
        className={`
          relative block border border-dashed p-16
          cursor-pointer transition-all duration-150
          flex flex-col items-center justify-center gap-6
          ${
            isDragging
              ? "border-[#D97706] bg-[rgba(217,119,6,0.05)]"
              : "border-[rgba(168,162,158,0.2)] hover:border-[#D97706] hover:bg-[rgba(217,119,6,0.03)]"
          }
          ${isLoading ? "pointer-events-none opacity-50" : ""}
        `}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          className="hidden"
          accept="image/*,.pdf,.xlsx,.xls"
          onChange={handleFileInput}
          disabled={isLoading}
          multiple
        />

        <Upload
          className={`w-12 h-12 stroke-[1.5] transition-colors duration-150 ${
            isDragging ? "text-[#D97706]" : "text-[#78716C]"
          }`}
        />

        <div className="text-center">
          <p className={`text-base font-medium transition-colors duration-150 ${
            isDragging ? "text-[#D97706]" : "text-[#F5F5F4]"
          }`}>
            {isDragging ? "Drop files here" : "Drag & drop or click to upload"}
          </p>
          <p className="text-[#78716C] text-sm mt-2">
            Up to {maxFiles} files
          </p>
        </div>

        <div className="flex items-center gap-2 text-[#78716C] text-xs">
          <div className="flex items-center gap-1.5">
            <FileImage className="w-3.5 h-3.5" />
            <span>Image</span>
          </div>
          <span className="text-[rgba(168,162,158,0.3)]">|</span>
          <div className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            <span>PDF</span>
          </div>
          <span className="text-[rgba(168,162,158,0.3)]">|</span>
          <div className="flex items-center gap-1.5">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel</span>
          </div>
        </div>
      </label>
    </div>
  );
}
