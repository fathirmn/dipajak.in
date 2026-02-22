"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Edit3 } from "lucide-react";
import type { ExtractedInvoice, InvoiceItem } from "@/lib/schemas";

interface DataFormProps {
  data: ExtractedInvoice | null;
  onChange: (data: ExtractedInvoice) => void;
}

export function DataForm({ data, onChange }: DataFormProps) {
  if (!data) {
    return (
      <div className="p-6">
        <h3 className="text-xs uppercase tracking-[0.05em] font-medium text-[#78716C] mb-4 flex items-center gap-2">
          <Edit3 className="w-4 h-4" />
          Extracted Data
        </h3>
        <div className="flex items-center justify-center h-48 text-[#78716C]">
          <p>Upload an invoice to extract data</p>
        </div>
      </div>
    );
  }

  const updateField = (field: keyof ExtractedInvoice, value: string | number) => {
    onChange({ ...data, [field]: value });
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...data.items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === "quantity" || field === "unitPrice" || field === "discount") {
      const item = newItems[index];
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unitPrice) || 0;
      const discount = Number(item.discount) || 0;
      const vatRate = data.originalVatRate || 11;
      const taxBase = qty * price - discount;
      const vat = Math.round(taxBase * vatRate / 100);
      newItems[index].taxBase = taxBase;
      newItems[index].vat = vat;
    }

    const subtotal = newItems.reduce((sum, item) => sum + (item.taxBase || 0), 0);
    const totalVat = newItems.reduce((sum, item) => sum + (item.vat || 0), 0);

    onChange({
      ...data,
      items: newItems,
      subtotal,
      totalVat,
      grandTotal: subtotal + totalVat,
    });
  };

  const addItem = () => {
    const newItem: InvoiceItem = {
      name: "",
      code: "000000",
      unit: "Kg",
      unitCode: "UM.0003",
      opt: "A",
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      taxBase: 0,
      vatRate: data.originalVatRate || 11,
      vat: 0,
    };
    onChange({ ...data, items: [...data.items, newItem] });
  };

  const removeItem = (index: number) => {
    const newItems = data.items.filter((_, i) => i !== index);
    const subtotal = newItems.reduce((sum, item) => sum + (item.taxBase || 0), 0);
    const totalVat = newItems.reduce((sum, item) => sum + (item.vat || 0), 0);
    onChange({
      ...data,
      items: newItems,
      subtotal,
      totalVat,
      grandTotal: subtotal + totalVat,
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID").format(value);
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="space-y-4">
        <h4 className="text-xs uppercase tracking-[0.05em] font-medium text-[#78716C]">
          Invoice Details
        </h4>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-1">
            <Label className="text-[11px] uppercase tracking-[0.05em] text-[#78716C]">
              Invoice Number
            </Label>
            <Input
              value={data.invoiceNumber}
              onChange={(e) => updateField("invoiceNumber", e.target.value)}
              style={{ fontFamily: "var(--font-jetbrains)" }}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] uppercase tracking-[0.05em] text-[#78716C]">
              Invoice Date
            </Label>
            <Input
              type="date"
              value={data.invoiceDate}
              onChange={(e) => updateField("invoiceDate", e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Buyer Section */}
      <div className="space-y-4">
        <h4 className="text-xs uppercase tracking-[0.05em] font-medium text-[#78716C]">
          Buyer Information
        </h4>

        <div className="space-y-1">
          <Label className="text-[11px] uppercase tracking-[0.05em] text-[#78716C]">
            Buyer Name
          </Label>
          <Input
            value={data.buyerName}
            onChange={(e) => updateField("buyerName", e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-1">
            <Label className="text-[11px] uppercase tracking-[0.05em] text-[#78716C]">
              NPWP <span className="text-[#DC2626]">*</span>
            </Label>
            <Input
              value={data.buyerNpwp || ""}
              onChange={(e) => updateField("buyerNpwp", e.target.value.replace(/\D/g, "").slice(0, 16))}
              placeholder="16 digits"
              maxLength={16}
              style={{ fontFamily: "var(--font-jetbrains)" }}
              className={!data.buyerNpwp || data.buyerNpwp.length !== 16 ? "!border-[#D97706]" : ""}
            />
            {(!data.buyerNpwp || data.buyerNpwp.length !== 16) && (
              <p className="text-[11px] text-[#D97706] mt-1">
                {data.buyerNpwp?.length || 0}/16 digits
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] uppercase tracking-[0.05em] text-[#78716C]">
              Email <span className="text-[#DC2626]">*</span>
            </Label>
            <Input
              type="email"
              value={data.buyerEmail || ""}
              onChange={(e) => updateField("buyerEmail", e.target.value)}
              placeholder="buyer@example.com"
              className={!data.buyerEmail ? "!border-[#D97706]" : ""}
            />
            {!data.buyerEmail && (
              <p className="text-[11px] text-[#D97706] mt-1">Required</p>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] uppercase tracking-[0.05em] text-[#78716C]">
            Address
          </Label>
          <Input
            value={data.buyerAddress || ""}
            onChange={(e) => updateField("buyerAddress", e.target.value)}
          />
        </div>
      </div>

      {/* Items Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs uppercase tracking-[0.05em] font-medium text-[#78716C]">
            Line Items
          </h4>
          <Button
            size="sm"
            variant="ghost"
            onClick={addItem}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>

        <div className="border border-[rgba(168,162,158,0.1)] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#1C1C1F]">
              <tr className="text-left">
                <th className="px-4 py-3 text-[11px] uppercase tracking-[0.05em] font-medium text-[#78716C]">
                  Item
                </th>
                <th className="px-3 py-3 text-[11px] uppercase tracking-[0.05em] font-medium text-[#78716C] w-16">
                  Unit
                </th>
                <th className="px-3 py-3 text-[11px] uppercase tracking-[0.05em] font-medium text-[#78716C] w-16 text-right">
                  Qty
                </th>
                <th className="px-3 py-3 text-[11px] uppercase tracking-[0.05em] font-medium text-[#78716C] w-24 text-right">
                  Price
                </th>
                <th className="px-3 py-3 text-[11px] uppercase tracking-[0.05em] font-medium text-[#78716C] w-28 text-right">
                  DPP
                </th>
                <th className="px-3 py-3 text-[11px] uppercase tracking-[0.05em] font-medium text-[#78716C] w-24 text-right">
                  VAT
                </th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(168,162,158,0.1)]">
              {data.items.map((item, index) => (
                <tr key={index} className="group hover:bg-[rgba(217,119,6,0.03)] transition-colors duration-150">
                  <td className="px-4 py-2">
                    <input
                      value={item.name}
                      onChange={(e) => updateItem(index, "name", e.target.value)}
                      className="w-full bg-transparent border-0 text-[#F5F5F4] text-sm focus:outline-none focus:ring-0"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-xs text-[#78716C]" title={item.unitCode}>
                      {item.unit || "Kg"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, "quantity", Number(e.target.value))}
                      className="w-14 bg-transparent border-0 text-[#F5F5F4] text-sm text-right focus:outline-none focus:ring-0"
                      style={{ fontFamily: "var(--font-jetbrains)" }}
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(index, "unitPrice", Number(e.target.value))}
                      className="w-20 bg-transparent border-0 text-[#F5F5F4] text-sm text-right focus:outline-none focus:ring-0"
                      style={{ fontFamily: "var(--font-jetbrains)" }}
                    />
                  </td>
                  <td
                    className="px-3 py-2 text-right text-[#A8A29E]"
                    style={{ fontFamily: "var(--font-jetbrains)" }}
                  >
                    {formatCurrency(item.taxBase)}
                  </td>
                  <td
                    className="px-3 py-2 text-right text-[#D97706]"
                    style={{ fontFamily: "var(--font-jetbrains)" }}
                  >
                    {formatCurrency(item.vat)}
                  </td>
                  <td className="px-2 py-2">
                    <button
                      onClick={() => removeItem(index)}
                      className="text-[#78716C] hover:text-[#DC2626] p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals Section */}
      <div className="border-t border-[rgba(168,162,158,0.1)] pt-6 space-y-3">
        {data.mosValue && data.mosValue > 0 && (
          <div className="mb-4 p-3 bg-[rgba(217,119,6,0.08)] border border-[rgba(217,119,6,0.2)]">
            <p className="text-[11px] uppercase tracking-[0.05em] font-medium text-[#D97706] mb-1">
              MOS (Memo of Sales) Applied
            </p>
            <p className="text-xs text-[#A8A29E]" style={{ fontFamily: "var(--font-jetbrains)" }}>
              Discount applied: DPP adjusted to Rp {formatCurrency(data.mosValue)}
            </p>
          </div>
        )}
        <div className="flex justify-between items-center">
          <span className="text-sm text-[#78716C]">Subtotal (DPP)</span>
          <span
            className="text-[#A8A29E]"
            style={{ fontFamily: "var(--font-jetbrains)" }}
          >
            Rp {formatCurrency(data.subtotal)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-[#78716C]">VAT ({data.originalVatRate || 11}%)</span>
          <span
            className="text-[#D97706]"
            style={{ fontFamily: "var(--font-jetbrains)" }}
          >
            Rp {formatCurrency(data.totalVat)}
          </span>
        </div>
        <div className="flex justify-between items-center pt-2 border-t border-[rgba(168,162,158,0.1)]">
          <span className="text-base font-semibold text-[#F5F5F4]">Grand Total</span>
          <span
            className="text-lg font-semibold text-[#F5F5F4]"
            style={{ fontFamily: "var(--font-jetbrains)" }}
          >
            Rp {formatCurrency(data.grandTotal)}
          </span>
        </div>

        {data.originalVatRate !== 12 && (
          <div className="pt-4 mt-4 border-t border-[rgba(168,162,158,0.1)]">
            <p className="text-[11px] uppercase tracking-[0.05em] font-medium text-[#78716C] mb-2">
              Coretax Conversion (11% → 12%)
            </p>
            <p className="text-xs text-[#A8A29E]" style={{ fontFamily: "var(--font-jetbrains)" }}>
              DPP Nilai Lain = {formatCurrency(data.subtotal)} × 11/12 = Rp {formatCurrency(Math.round(data.subtotal * (data.originalVatRate || 11) / 12))}
            </p>
            <p className="text-xs text-[#78716C] mt-1">
              VAT amount stays the same, only DPP base changes in XML
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
