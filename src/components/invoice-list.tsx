"use client";

import { useState } from "react";
import {
  FileText, Check, AlertCircle, Loader2, ChevronDown, ChevronUp,
  Trash2, Clock, ShieldCheck, ShieldAlert, RefreshCw, XCircle, Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataForm } from "@/components/data-form";
import type { ExtractedInvoice } from "@/lib/schemas";
import { validateInvoice } from "@/lib/rule-engine";

export type InvoiceStatus = "pending" | "processing" | "done" | "error";

export interface InvoiceFile {
  id: string;
  file: File;
  status: InvoiceStatus;
  data: ExtractedInvoice | null;
  error?: string;
}

interface InvoiceListProps {
  invoices: InvoiceFile[];
  onUpdateInvoice: (id: string, data: ExtractedInvoice) => void;
  onRemoveInvoice: (id: string) => void;
  onRetryFile: (id: string) => void;
  onClearAll: () => void;
  onDuplicateInvoice: (id: string) => void;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

export function InvoiceList({
  invoices,
  onUpdateInvoice,
  onRemoveInvoice,
  onRetryFile,
  onClearAll,
  onDuplicateInvoice,
}: InvoiceListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  if (invoices.length === 0) return null;

  const doneCount    = invoices.filter((i) => i.status === "done").length;
  const processingCount = invoices.filter((i) => i.status === "processing").length;
  const errorCount   = invoices.filter((i) => i.status === "error").length;
  const pendingCount = invoices.filter((i) => i.status === "pending").length;
  const isAnyProcessing = processingCount > 0 || pendingCount > 0;

  const toggleExpand = (id: string) =>
    setExpandedId(expandedId === id ? null : id);

  const handleClearClick = () => {
    if (confirmClear) {
      onClearAll();
      setConfirmClear(false);
    } else {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
    }
  };

  const getStatusIcon = (status: InvoiceStatus) => {
    switch (status) {
      case "pending":    return <Clock    className="w-3.5 h-3.5 text-[#78716C]" />;
      case "processing": return <Loader2  className="w-3.5 h-3.5 text-[#D97706] animate-spin" />;
      case "done":       return <Check    className="w-3.5 h-3.5 text-[#059669]" />;
      case "error":      return <AlertCircle className="w-3.5 h-3.5 text-[#DC2626]" />;
    }
  };

  const getStatusBadge = (status: InvoiceStatus) => {
    const styles: Record<InvoiceStatus, string> = {
      pending:    "text-[#78716C] bg-[rgba(120,113,108,0.08)]",
      processing: "text-[#D97706] bg-[rgba(217,119,6,0.1)]",
      done:       "text-[#059669] bg-[rgba(5,150,105,0.1)]",
      error:      "text-[#DC2626] bg-[rgba(220,38,38,0.1)]",
    };
    const labels: Record<InvoiceStatus, string> = {
      pending: "Menunggu", processing: "Memproses...", done: "Siap", error: "Gagal",
    };
    return (
      <span className={`text-[10px] px-2 py-0.5 uppercase tracking-[0.05em] font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="bg-[#1C1C1F] border border-[rgba(168,162,158,0.1)]">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="px-6 py-4 border-b border-[rgba(168,162,158,0.1)]">
        <div className="flex items-center justify-between">
          <h3 className="text-xs uppercase tracking-[0.05em] font-medium text-[#78716C] flex items-center gap-2">
            <FileText className="w-3.5 h-3.5" />
            Faktur ({invoices.length})
          </h3>
          <div className="flex items-center gap-3">
            {/* Stats */}
            <div className="flex items-center gap-3 text-[11px]">
              {doneCount > 0    && <span className="text-[#059669]">{doneCount} siap</span>}
              {processingCount > 0 && <span className="text-[#D97706]">{processingCount} diproses</span>}
              {errorCount > 0   && <span className="text-[#DC2626]">{errorCount} gagal</span>}
            </div>

            {/* Clear All — 2-step confirm */}
            {invoices.length > 1 && !isAnyProcessing && (
              <button
                onClick={handleClearClick}
                className={`flex items-center gap-1 text-[10px] uppercase tracking-[0.05em] transition-all duration-150 ${
                  confirmClear
                    ? "text-[#DC2626] font-semibold animate-pulse"
                    : "text-[#78716C] hover:text-[#DC2626]"
                }`}
              >
                <XCircle className="w-3 h-3" />
                {confirmClear ? "Yakin? Klik lagi" : "Hapus Semua"}
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {isAnyProcessing && (
          <div className="mt-3 h-[2px] bg-[rgba(168,162,158,0.1)] overflow-hidden">
            <div
              className="h-full bg-[#D97706] transition-all duration-500"
              style={{ width: `${(doneCount / invoices.length) * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* ── Invoice rows ─────────────────────────────────────────── */}
      <div className="divide-y divide-[rgba(168,162,158,0.1)]">
        {invoices.map((invoice) => (
          <div
            key={invoice.id}
            className={`transition-colors duration-150 ${
              dragOverId === invoice.id ? "bg-[rgba(217,119,6,0.05)]" : ""
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOverId(invoice.id); }}
            onDragLeave={() => setDragOverId(null)}
          >
            <div
              className={`group flex items-center justify-between px-6 py-4 ${
                invoice.status === "done" ? "cursor-pointer hover:bg-[rgba(217,119,6,0.03)]" : ""
              }`}
              onClick={() => invoice.status === "done" && toggleExpand(invoice.id)}
            >
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">{getStatusIcon(invoice.status)}</div>

                <div className="min-w-0">
                  <p className="text-[#F5F5F4] text-sm font-medium truncate max-w-[260px]">
                    {invoice.file.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {getStatusBadge(invoice.status)}
                    {/* Skeleton shimmer when processing */}
                    {invoice.status === "processing" && (
                      <div className="flex items-center gap-2">
                        <span className="text-[rgba(168,162,158,0.3)]">·</span>
                        <span className="inline-block h-2.5 w-28 bg-[rgba(217,119,6,0.15)] animate-pulse" />
                        <span className="text-[rgba(168,162,158,0.3)]">·</span>
                        <span className="inline-block h-2.5 w-20 bg-[rgba(168,162,158,0.1)] animate-pulse" />
                        <span className="text-[rgba(168,162,158,0.3)]">·</span>
                        <span className="inline-block h-2.5 w-16 bg-[rgba(217,119,6,0.1)] animate-pulse" />
                      </div>
                    )}
                    {invoice.data && (
                      <>
                        <span className="text-[rgba(168,162,158,0.3)]">·</span>
                        <span className="text-[11px] text-[#A8A29E]" style={{ fontFamily: "var(--font-jetbrains)" }}>
                          {invoice.data.invoiceNumber}
                        </span>
                        <span className="text-[rgba(168,162,158,0.3)]">·</span>
                        <span className="text-[11px] text-[#78716C]" style={{ fontFamily: "var(--font-jetbrains)" }}>
                          DPP {formatCurrency(invoice.data.subtotal)}
                        </span>
                        <span className="text-[rgba(168,162,158,0.3)]">·</span>
                        <span className="text-[11px] text-[#D97706]" style={{ fontFamily: "var(--font-jetbrains)" }}>
                          PPN {formatCurrency(invoice.data.totalVat)}
                        </span>
                      </>
                    )}
                  </div>
                  {invoice.error && (
                    <p className="text-[11px] text-[#DC2626] mt-0.5 truncate max-w-[260px]">
                      {invoice.error}
                    </p>
                  )}
                </div>
              </div>

              {/* Right actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {/* Validation badge */}
                {invoice.status === "done" && invoice.data && (() => {
                  const r = validateInvoice(invoice.data);
                  if (r.errorCount > 0)
                    return (
                      <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-[rgba(220,38,38,0.1)] text-[#DC2626]">
                        <ShieldAlert className="w-3 h-3" /> {r.errorCount} error
                      </span>
                    );
                  if (r.warningCount > 0)
                    return (
                      <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-[rgba(217,119,6,0.1)] text-[#D97706]">
                        <ShieldAlert className="w-3 h-3" /> {r.warningCount} peringatan
                      </span>
                    );
                  return (
                    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-[rgba(5,150,105,0.1)] text-[#059669]">
                      <ShieldCheck className="w-3 h-3" /> Valid
                    </span>
                  );
                })()}

                {/* Retry */}
                {invoice.status === "error" && (
                  <Button
                    variant="ghost" size="icon-sm"
                    onClick={(e) => { e.stopPropagation(); onRetryFile(invoice.id); }}
                    className="text-[#D97706] hover:!bg-[rgba(217,119,6,0.1)]"
                    title="Coba lagi"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </Button>
                )}

                {/* Duplicate */}
                {invoice.status === "done" && (
                  <Button
                    variant="ghost" size="icon-sm"
                    onClick={(e) => { e.stopPropagation(); onDuplicateInvoice(invoice.id); }}
                    className="opacity-0 group-hover:opacity-60 hover:!opacity-100 text-[#78716C] hover:!text-[#D97706] hover:!bg-[rgba(217,119,6,0.08)]"
                    title="Duplikat faktur"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                )}

                {/* Expand/collapse */}
                {invoice.status === "done" && (
                  <Button variant="ghost" size="icon-sm" className="opacity-50 hover:opacity-100">
                    {expandedId === invoice.id
                      ? <ChevronUp className="w-4 h-4" />
                      : <ChevronDown className="w-4 h-4" />}
                  </Button>
                )}

                {/* Delete */}
                <Button
                  variant="ghost" size="icon-sm"
                  onClick={(e) => { e.stopPropagation(); onRemoveInvoice(invoice.id); }}
                  className="text-[#78716C] hover:!text-[#DC2626] hover:!bg-[rgba(220,38,38,0.1)]"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Expanded form */}
            {expandedId === invoice.id && invoice.data && (
              <div className="border-t border-[rgba(168,162,158,0.1)] px-6 py-6 bg-[#141416]">
                <DataForm
                  data={invoice.data}
                  onChange={(data) => onUpdateInvoice(invoice.id, data)}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
