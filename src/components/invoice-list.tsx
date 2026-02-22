"use client";

import { useState } from "react";
import { FileText, Check, AlertCircle, Loader2, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataForm } from "@/components/data-form";
import type { ExtractedInvoice } from "@/lib/schemas";

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
}

export function InvoiceList({ invoices, onUpdateInvoice, onRemoveInvoice }: InvoiceListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (invoices.length === 0) return null;

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getStatusIndicator = (status: InvoiceStatus) => {
    switch (status) {
      case "pending":
        return <div className="w-2 h-2 rounded-full bg-[#78716C]" />;
      case "processing":
        return <Loader2 className="w-4 h-4 text-[#D97706] animate-spin" />;
      case "done":
        return <Check className="w-4 h-4 text-[#059669]" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-[#DC2626]" />;
    }
  };

  const getStatusText = (status: InvoiceStatus) => {
    switch (status) {
      case "pending":
        return "Pending";
      case "processing":
        return "Extracting...";
      case "done":
        return "Ready";
      case "error":
        return "Failed";
    }
  };

  return (
    <div className="bg-[#1C1C1F] border border-[rgba(168,162,158,0.1)]">
      <div className="px-6 py-4 border-b border-[rgba(168,162,158,0.1)]">
        <h3 className="text-xs uppercase tracking-[0.05em] font-medium text-[#78716C] flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Invoices ({invoices.length})
        </h3>
      </div>

      <div className="divide-y divide-[rgba(168,162,158,0.1)]">
        {invoices.map((invoice) => (
          <div key={invoice.id}>
            <div
              className={`group flex items-center justify-between px-6 py-4 transition-colors duration-150 ${
                invoice.status === "done" ? "cursor-pointer hover:bg-[rgba(217,119,6,0.03)]" : ""
              }`}
              onClick={() => invoice.status === "done" && toggleExpand(invoice.id)}
            >
              <div className="flex items-center gap-4">
                {getStatusIndicator(invoice.status)}
                <div className="min-w-0">
                  <p className="text-[#F5F5F4] text-sm font-medium truncate max-w-[280px]">
                    {invoice.file.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-xs ${
                      invoice.status === "processing" ? "text-[#D97706]" :
                      invoice.status === "error" ? "text-[#DC2626]" :
                      "text-[#78716C]"
                    }`}>
                      {getStatusText(invoice.status)}
                    </span>
                    {invoice.data && (
                      <>
                        <span className="text-[rgba(168,162,158,0.3)]">·</span>
                        <span
                          className="text-xs text-[#A8A29E]"
                          style={{ fontFamily: "var(--font-jetbrains)" }}
                        >
                          {invoice.data.invoiceNumber}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {invoice.error && (
                  <span className="text-[#DC2626] text-xs mr-2 max-w-[150px] truncate">{invoice.error}</span>
                )}
                {invoice.status === "done" && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="opacity-60 hover:opacity-100"
                  >
                    {expandedId === invoice.id ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveInvoice(invoice.id);
                  }}
                  className="text-[#78716C] hover:!text-[#DC2626] hover:!bg-[rgba(220,38,38,0.1)]"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

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
