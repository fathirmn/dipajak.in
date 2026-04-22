"use client";

import { useCallback, useState } from "react";
import { Upload, FileSpreadsheet, FileImage, FileText, AlertCircle } from "lucide-react";

const MAX_FILE_SIZE_MB = 20;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

interface UploadZoneProps {
  onFilesSelect: (files: File[]) => void;
  isLoading?: boolean;
  maxFiles?: number;
}

export function UploadZone({ onFilesSelect, isLoading, maxFiles = 10 }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [sizeErrors, setSizeErrors] = useState<string[]>([]);

  const filterFiles = useCallback(
    (raw: File[]): File[] => {
      const errors: string[] = [];
      const valid = raw.slice(0, maxFiles).filter((f) => {
        if (f.size > MAX_FILE_SIZE_BYTES) {
          errors.push(`${f.name} (${(f.size / 1024 / 1024).toFixed(1)} MB) — melebihi batas ${MAX_FILE_SIZE_MB} MB`);
          return false;
        }
        return true;
      });
      setSizeErrors(errors);
      if (errors.length > 0) setTimeout(() => setSizeErrors([]), 5000);
      return valid;
    },
    [maxFiles]
  );

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
      const files = filterFiles(Array.from(e.dataTransfer.files));
      if (files.length > 0) onFilesSelect(files);
    },
    [onFilesSelect, filterFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = filterFiles(Array.from(e.target.files || []));
      if (files.length > 0) onFilesSelect(files);
      e.target.value = "";
    },
    [onFilesSelect, filterFiles]
  );

  const fileTypes = [
    { icon: FileImage, label: "Gambar" },
    { icon: FileText, label: "PDF" },
    { icon: FileSpreadsheet, label: "Excel" },
  ];

  return (
    <div className="relative overflow-hidden bg-[#1C1C1F] border border-[rgba(168,162,158,0.1)]">
      {/* Dot grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(168,162,158,0.12) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />

      <div className="relative p-6">
        <h3 className="text-xs uppercase tracking-[0.05em] font-medium text-[#78716C] mb-5 flex items-center gap-2">
          <Upload className="w-3.5 h-3.5" />
          Unggah Invoice
        </h3>

        <label
          className={`
            relative block border border-dashed p-14
            cursor-pointer transition-all duration-200
            flex flex-col items-center justify-center gap-5
            ${isDragging
              ? "border-[#D97706] bg-[rgba(217,119,6,0.06)]"
              : "border-[rgba(168,162,158,0.2)] hover:border-[rgba(217,119,6,0.45)] hover:bg-[rgba(217,119,6,0.03)]"
            }
            ${isLoading ? "pointer-events-none opacity-50" : ""}
          `}
          onDragEnter={handleDragIn}
          onDragLeave={handleDragOut}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {isDragging && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(217,119,6,0.1) 0%, transparent 70%)",
              }}
            />
          )}

          <input
            type="file"
            className="hidden"
            accept="image/*,.pdf,.xlsx,.xls"
            onChange={handleFileInput}
            disabled={isLoading}
            multiple
          />

          <div
            className={`relative rounded-full p-4 transition-all duration-200 ${
              isDragging ? "bg-[rgba(217,119,6,0.18)]" : "bg-[rgba(168,162,158,0.07)]"
            }`}
          >
            <Upload
              className={`w-7 h-7 stroke-[1.5] transition-colors duration-200 ${
                isDragging ? "text-[#D97706]" : "text-[#78716C]"
              }`}
            />
          </div>

          <div className="text-center space-y-1.5">
            <p
              className={`text-base font-medium transition-colors duration-200 ${
                isDragging ? "text-[#D97706]" : "text-[#F5F5F4]"
              }`}
            >
              {isDragging ? "Lepaskan file di sini" : "Seret & lepas atau klik untuk upload"}
            </p>
            <p className="text-[#78716C] text-sm">
              Hingga {maxFiles} file · Maks {MAX_FILE_SIZE_MB} MB per file
            </p>
          </div>

          <div className="flex items-center gap-2">
            {fileTypes.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-[rgba(168,162,158,0.07)] border border-[rgba(168,162,158,0.12)] text-[#78716C] text-xs"
              >
                <Icon className="w-3 h-3" />
                {label}
              </span>
            ))}
          </div>
        </label>

        {/* Size error messages */}
        {sizeErrors.length > 0 && (
          <div className="mt-3 space-y-1">
            {sizeErrors.map((err, i) => (
              <div
                key={i}
                className="flex items-start gap-2 px-3 py-2 bg-[rgba(220,38,38,0.07)] border border-[rgba(220,38,38,0.2)] text-[#DC2626] text-xs"
              >
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>File terlalu besar: {err}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
