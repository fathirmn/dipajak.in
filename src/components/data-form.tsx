"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Edit3, BookUser, X, Search, GripVertical, Save } from "lucide-react";
import type { ExtractedInvoice, InvoiceItem } from "@/lib/schemas";
import { ValidationPanel } from "@/components/validation-panel";
import { validateInvoice } from "@/lib/rule-engine";
import { TRANSACTION_CODES, UNIT_CODE_NAMES, calculateDppNilaiLain } from "@/lib/constants";
import { useCustomers, type SavedCustomer } from "@/lib/hooks/use-customers";

// Unit groups untuk dropdown satuan
const UNIT_GROUPS = [
  {
    label: "── Umum ──",
    codes: ["UM.0018", "UM.0019", "UM.0021", "UM.0017", "UM.0020", "UM.0022", "UM.0037"],
  },
  {
    label: "── Jasa ──",
    codes: ["UM.0030", "UM.0031", "UM.0027", "UM.0026", "UM.0025", "UM.0024", "UM.0023", "UM.0029"],
  },
  {
    label: "── Berat ──",
    codes: ["UM.0003", "UM.0004", "UM.0001", "UM.0002", "UM.0005"],
  },
  {
    label: "── Volume ──",
    codes: ["UM.0007", "UM.0006", "UM.0008", "UM.0034", "UM.0036", "UM.0009"],
  },
  {
    label: "── Panjang / Luas ──",
    codes: ["UM.0013", "UM.0015", "UM.0014", "UM.0016", "UM.0012", "UM.0035", "UM.0011"],
  },
  {
    label: "── Energi / Lain ──",
    codes: ["UM.0038", "UM.0010", "UM.0028", "UM.0032", "UM.0039", "UM.0033"],
  },
];

// ─── CustomerBook Component ────────────────────────────────────────────────────

interface CustomerBookProps {
  currentName: string;
  currentNpwp: string;
  onSelect: (name: string, npwp: string) => void;
  customers: SavedCustomer[];
  loadingCustomers: boolean;
  onAdd: (name: string, npwp: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function CustomerBook({ currentName, currentNpwp, onSelect, customers, loadingCustomers, onAdd, onDelete }: CustomerBookProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [saveMsg, setSaveMsg] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const npwpValid = /^\d{16}$/.test(currentNpwp);
  const canSave =
    currentName.trim().length > 0 &&
    npwpValid &&
    !customers.some((c) => c.npwp === currentNpwp);

  const handleSave = async () => {
    try {
      await onAdd(currentName.trim(), currentNpwp);
      setSaveMsg("Tersimpan!");
      setTimeout(() => setSaveMsg(""), 2000);
    } catch {
      setSaveMsg("Gagal menyimpan");
      setTimeout(() => setSaveMsg(""), 2000);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await onDelete(id);
    } catch {
      // silent fail
    }
  };

  const handleSelect = (c: SavedCustomer) => {
    onSelect(c.name, c.npwp);
    setOpen(false);
    setQuery("");
  };

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.npwp.includes(query)
  );

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Buku Pembeli"
        className={`flex items-center gap-1 text-[10px] uppercase tracking-[0.05em] font-medium px-2 py-1 border transition-all duration-150 ${
          open
            ? "border-[rgba(217,119,6,0.5)] bg-[rgba(217,119,6,0.08)] text-[#D97706]"
            : "border-[rgba(168,162,158,0.15)] text-[#78716C] hover:border-[rgba(217,119,6,0.35)] hover:text-[#D97706]"
        }`}
      >
        <BookUser className="w-3 h-3" />
        Buku Pembeli
        {loadingCustomers ? (
          <span className="ml-0.5 text-[9px] text-[#78716C]">...</span>
        ) : customers.length > 0 ? (
          <span className="ml-0.5 text-[9px] bg-[rgba(217,119,6,0.15)] text-[#D97706] px-1 py-0.5">
            {customers.length}
          </span>
        ) : null}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 w-80 bg-[#1C1C1F] border border-[rgba(168,162,158,0.15)] shadow-xl">
          {/* Save current */}
          <div className="px-3 pt-3 pb-2 border-b border-[rgba(168,162,158,0.1)]">
            <p className="text-[10px] text-[#78716C] uppercase tracking-[0.05em] mb-2">
              Simpan Pembeli Saat Ini
            </p>
            {canSave ? (
              <button
                onClick={handleSave}
                className="w-full flex items-center gap-2 px-3 py-2 bg-[rgba(5,150,105,0.07)] border border-[rgba(5,150,105,0.2)] text-[#059669] text-xs hover:bg-[rgba(5,150,105,0.12)] transition-colors"
              >
                <Save className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">
                  {saveMsg || `Simpan "${currentName}"`}
                </span>
              </button>
            ) : (
              <p className="text-[11px] text-[#78716C] italic">
                {currentNpwp.length === 16 && currentName.trim()
                  ? "NPWP ini sudah tersimpan"
                  : "Isi Nama Pembeli + NPWP 16 digit untuk menyimpan"}
              </p>
            )}
          </div>

          {/* Search */}
          {customers.length > 0 && (
            <div className="px-3 pt-2">
              <div className="flex items-center gap-2 border-b border-[rgba(168,162,158,0.12)] pb-1">
                <Search className="w-3 h-3 text-[#78716C] flex-shrink-0" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari nama atau NPWP..."
                  className="flex-1 bg-transparent text-xs text-[#F5F5F4] placeholder-[#78716C] focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Customer list */}
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-[11px] text-[#78716C] text-center">
                {customers.length === 0 ? "Belum ada pembeli tersimpan" : "Tidak ditemukan"}
              </p>
            ) : (
              <div className="py-1">
                {filtered.map((c) => (
                  <div
                    key={c.id}
                    className="group flex items-center gap-2 px-3 py-2 hover:bg-[rgba(217,119,6,0.05)] cursor-pointer transition-colors"
                    onClick={() => handleSelect(c)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[#F5F5F4] truncate">{c.name}</p>
                      <p
                        className="text-[10px] text-[#78716C] mt-0.5"
                        style={{ fontFamily: "var(--font-jetbrains)" }}
                      >
                        {c.npwp}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(c.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-[#78716C] hover:text-[#DC2626] transition-all"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── DataForm ─────────────────────────────────────────────────────────────────

interface DataFormProps {
  data: ExtractedInvoice | null;
  onChange: (data: ExtractedInvoice) => void;
}

export function DataForm({ data, onChange }: DataFormProps) {
  const { customers, loading: loadingCustomers, addCustomer, deleteCustomer } = useCustomers();

  if (!data) {
    return (
      <div className="p-6">
        <h3 className="text-xs uppercase tracking-[0.05em] font-medium text-[#78716C] mb-4 flex items-center gap-2">
          <Edit3 className="w-4 h-4" />
          Data Faktur
        </h3>
        <div className="flex items-center justify-center h-48 text-[#78716C]">
          <p>Unggah faktur untuk mengekstrak data</p>
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
      const vat = Math.round((taxBase * vatRate) / 100);
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

  const handleUnitChange = (index: number, unitCode: string) => {
    const unitName = UNIT_CODE_NAMES[unitCode] || "Lainnya";
    const newItems = [...data.items];
    newItems[index] = { ...newItems[index], unitCode, unit: unitName };
    onChange({ ...data, items: newItems });
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
      vatRate: 12,
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

  // ── Drag-to-reorder state ──────────────────────────────────────────
  const [dragItemIdx, setDragItemIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const handleItemDragStart = (index: number) => setDragItemIdx(index);

  const handleItemDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragItemIdx !== null && dragOverIdx !== index) setDragOverIdx(index);
  };

  const handleItemDrop = (targetIndex: number) => {
    if (dragItemIdx === null || dragItemIdx === targetIndex) {
      setDragItemIdx(null);
      setDragOverIdx(null);
      return;
    }
    const newItems = [...data.items];
    const [moved] = newItems.splice(dragItemIdx, 1);
    newItems.splice(targetIndex, 0, moved);
    const subtotal = newItems.reduce((s, it) => s + (it.taxBase || 0), 0);
    const totalVat = newItems.reduce((s, it) => s + (it.vat || 0), 0);
    onChange({ ...data, items: newItems, subtotal, totalVat, grandTotal: subtotal + totalVat });
    setDragItemIdx(null);
    setDragOverIdx(null);
  };

  const handleItemDragEnd = () => {
    setDragItemIdx(null);
    setDragOverIdx(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID").format(value);
  };

  const validationReport = validateInvoice(data);

  return (
    <div className="space-y-6">
      {/* Hasil Validasi Rule-Based Expert System */}
      <ValidationPanel report={validationReport} />

      {/* ── Detail Faktur ──────────────────────────────────────────── */}
      <div className="space-y-4">
        <h4 className="text-xs uppercase tracking-[0.05em] font-medium text-[#78716C]">
          Detail Faktur
        </h4>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-1">
            <Label className="text-[11px] uppercase tracking-[0.05em] text-[#78716C]">
              Referensi
            </Label>
            <Input
              value={data.invoiceNumber}
              onChange={(e) => updateField("invoiceNumber", e.target.value)}
              style={{ fontFamily: "var(--font-jetbrains)" }}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] uppercase tracking-[0.05em] text-[#78716C]">
              Tanggal Faktur
            </Label>
            <Input
              type="date"
              value={data.invoiceDate}
              onChange={(e) => updateField("invoiceDate", e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-1">
            <Label className="text-[11px] uppercase tracking-[0.05em] text-[#78716C]">
              Kode Transaksi
            </Label>
            <select
              value={data.trxCode}
              onChange={(e) => updateField("trxCode", e.target.value)}
              className="w-full bg-transparent border-0 border-b border-[rgba(168,162,158,0.2)] text-[#F5F5F4] text-sm py-1.5 focus:outline-none focus:border-[#D97706] transition-colors duration-200"
            >
              {Object.entries(TRANSACTION_CODES).map(([code, desc]) => (
                <option key={code} value={code} className="bg-[#1C1C1F] text-[#F5F5F4]">
                  {code} — {desc.length > 40 ? desc.slice(0, 40) + "…" : desc}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-[#78716C] mt-1">
              {TRANSACTION_CODES[data.trxCode] || "Pilih kode transaksi"}
            </p>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] uppercase tracking-[0.05em] text-[#78716C]">
              Tarif PPN
            </Label>
            <div className="flex items-center gap-2 border-b border-[rgba(168,162,158,0.2)] py-1.5">
              <span
                className="text-sm text-[#F5F5F4] font-medium"
                style={{ fontFamily: "var(--font-jetbrains)" }}
              >
                12%
              </span>
              <span className="text-[10px] text-[#78716C]">
                — berlaku sejak 1 Januari 2025
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Data Pembeli ────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs uppercase tracking-[0.05em] font-medium text-[#78716C]">
            Data Pembeli
          </h4>
          {/* Buku Pembeli */}
          <CustomerBook
            currentName={data.buyerName}
            currentNpwp={data.buyerNpwp || ""}
            onSelect={(name, npwp) => onChange({ ...data, buyerName: name, buyerNpwp: npwp })}
            customers={customers}
            loadingCustomers={loadingCustomers}
            onAdd={addCustomer}
            onDelete={deleteCustomer}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] uppercase tracking-[0.05em] text-[#78716C]">
            Nama Pembeli
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
              onChange={(e) =>
                updateField("buyerNpwp", e.target.value.replace(/\D/g, "").slice(0, 16))
              }
              placeholder="16 digit"
              maxLength={16}
              style={{ fontFamily: "var(--font-jetbrains)" }}
              className={
                !data.buyerNpwp || data.buyerNpwp.length !== 16 ? "!border-[#D97706]" : ""
              }
            />
            {(!data.buyerNpwp || data.buyerNpwp.length !== 16) && (
              <p className="text-[11px] text-[#D97706] mt-1">
                {data.buyerNpwp?.length || 0}/16 digit
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] uppercase tracking-[0.05em] text-[#78716C]">
              Email{" "}
              <span className="normal-case text-[#78716C] text-[10px]">(opsional)</span>
            </Label>
            <Input
              type="email"
              value={data.buyerEmail || ""}
              onChange={(e) => updateField("buyerEmail", e.target.value)}
              placeholder="pembeli@contoh.com"
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] uppercase tracking-[0.05em] text-[#78716C]">
            Alamat
          </Label>
          <Input
            value={data.buyerAddress || ""}
            onChange={(e) => updateField("buyerAddress", e.target.value)}
          />
        </div>
      </div>

      {/* ── Daftar Barang/Jasa ──────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs uppercase tracking-[0.05em] font-medium text-[#78716C]">
            Daftar Barang/Jasa
          </h4>
          <Button size="sm" variant="ghost" onClick={addItem}>
            <Plus className="w-4 h-4 mr-1" />
            Tambah Item
          </Button>
        </div>

        {/* ── Mobile card layout (< sm) ──────────────────────────────── */}
        <div className="sm:hidden space-y-2">
          {data.items.length === 0 && (
            <p className="text-sm text-[#78716C] text-center py-6 border border-[rgba(168,162,158,0.1)]">
              Belum ada item — klik &quot;Tambah Item&quot; untuk menambahkan
            </p>
          )}
          {data.items.map((item, index) => (
            <div
              key={index}
              draggable
              onDragStart={() => handleItemDragStart(index)}
              onDragOver={(e) => handleItemDragOver(e, index)}
              onDrop={() => handleItemDrop(index)}
              onDragEnd={handleItemDragEnd}
              className={`border p-3 space-y-3 transition-colors duration-150 ${
                dragOverIdx === index && dragItemIdx !== index
                  ? "border-[rgba(217,119,6,0.5)] bg-[rgba(217,119,6,0.05)]"
                  : dragItemIdx === index
                  ? "border-[rgba(168,162,158,0.3)] opacity-50"
                  : "border-[rgba(168,162,158,0.1)] bg-[#141416]"
              }`}
            >
              {/* Row 1: drag handle + name + jenis + delete */}
              <div className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-[#78716C] flex-shrink-0 cursor-grab active:cursor-grabbing" />
                <input
                  value={item.name}
                  onChange={(e) => updateItem(index, "name", e.target.value)}
                  className="flex-1 bg-transparent text-[#F5F5F4] text-sm focus:outline-none min-w-0"
                  placeholder="Nama barang/jasa..."
                />
                <button
                  onClick={() => updateItem(index, "opt", item.opt === "A" ? "B" : "A")}
                  className={`text-[9px] px-1.5 py-0.5 uppercase font-medium tracking-[0.04em] border flex-shrink-0 ${
                    item.opt === "A"
                      ? "bg-[rgba(5,150,105,0.08)] border-[rgba(5,150,105,0.25)] text-[#059669]"
                      : "bg-[rgba(217,119,6,0.08)] border-[rgba(217,119,6,0.25)] text-[#D97706]"
                  }`}
                >
                  {item.opt === "A" ? "BRG" : "JSA"}
                </button>
                <button
                  onClick={() => removeItem(index)}
                  className="text-[#78716C] hover:text-[#DC2626] p-1 flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {/* Row 2: Satuan */}
              <div className="flex items-center gap-3">
                <span className="text-[10px] uppercase tracking-[0.05em] text-[#78716C] w-16 flex-shrink-0">Satuan</span>
                <select
                  value={item.unitCode || "UM.0018"}
                  onChange={(e) => handleUnitChange(index, e.target.value)}
                  className="flex-1 bg-transparent text-[#A8A29E] text-xs focus:outline-none focus:text-[#F5F5F4] cursor-pointer"
                >
                  {UNIT_GROUPS.map((group) => (
                    <optgroup key={group.label} label={group.label} className="bg-[#1C1C1F]">
                      {group.codes.map((code) => (
                        <option key={code} value={code} className="bg-[#1C1C1F] text-[#F5F5F4]">
                          {UNIT_CODE_NAMES[code]} ({code})
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              {/* Row 3: Qty + Harga */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.05em] text-[#78716C] mb-1">Qty</p>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, "quantity", Number(e.target.value))}
                    className="w-full bg-transparent text-[#F5F5F4] text-sm focus:outline-none"
                    style={{ fontFamily: "var(--font-jetbrains)" }}
                  />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.05em] text-[#78716C] mb-1">Harga Satuan</p>
                  <input
                    type="number"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(index, "unitPrice", Number(e.target.value))}
                    className="w-full bg-transparent text-[#F5F5F4] text-sm focus:outline-none"
                    style={{ fontFamily: "var(--font-jetbrains)" }}
                  />
                </div>
              </div>
              {/* Row 4: DPP + PPN */}
              <div className="flex items-center justify-between text-xs border-t border-[rgba(168,162,158,0.08)] pt-2">
                <span className="text-[#78716C]">
                  DPP <span className="text-[#A8A29E]" style={{ fontFamily: "var(--font-jetbrains)" }}>{formatCurrency(data.trxCode === "04" ? calculateDppNilaiLain(item.taxBase, data.originalVatRate || 11) : item.taxBase)}</span>
                </span>
                <span className="text-[#78716C]">
                  PPN <span className="text-[#D97706]" style={{ fontFamily: "var(--font-jetbrains)" }}>{formatCurrency(item.vat)}</span>
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* ── Desktop table layout (≥ sm) ────────────────────────────── */}
        <div className="hidden sm:block border border-[rgba(168,162,158,0.1)] overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#1C1C1F]">
              <tr className="text-left">
                <th className="w-6"></th>
                <th className="px-4 py-3 text-[11px] uppercase tracking-[0.05em] font-medium text-[#78716C]">
                  Nama Barang/Jasa
                </th>
                <th className="px-2 py-3 text-[11px] uppercase tracking-[0.05em] font-medium text-[#78716C] w-16 text-center">
                  Jenis
                </th>
                <th className="px-3 py-3 text-[11px] uppercase tracking-[0.05em] font-medium text-[#78716C] w-28">
                  Satuan
                </th>
                <th className="px-3 py-3 text-[11px] uppercase tracking-[0.05em] font-medium text-[#78716C] w-16 text-right">
                  Qty
                </th>
                <th className="px-3 py-3 text-[11px] uppercase tracking-[0.05em] font-medium text-[#78716C] w-24 text-right">
                  Harga Satuan
                </th>
                <th className="px-3 py-3 text-[11px] uppercase tracking-[0.05em] font-medium text-[#78716C] w-28 text-right">
                  DPP
                </th>
                <th className="px-3 py-3 text-[11px] uppercase tracking-[0.05em] font-medium text-[#78716C] w-24 text-right">
                  PPN
                </th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(168,162,158,0.1)]">
              {data.items.map((item, index) => (
                <tr
                  key={index}
                  draggable
                  onDragStart={() => handleItemDragStart(index)}
                  onDragOver={(e) => handleItemDragOver(e, index)}
                  onDrop={() => handleItemDrop(index)}
                  onDragEnd={handleItemDragEnd}
                  className={`group transition-colors duration-150 ${
                    dragOverIdx === index && dragItemIdx !== index
                      ? "bg-[rgba(217,119,6,0.08)] border-t border-[rgba(217,119,6,0.4)]"
                      : dragItemIdx === index
                      ? "opacity-40"
                      : "hover:bg-[rgba(217,119,6,0.03)]"
                  }`}
                >
                  <td className="pl-2 py-2 cursor-grab active:cursor-grabbing">
                    <GripVertical className="w-3.5 h-3.5 text-[#78716C] opacity-0 group-hover:opacity-60" />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      value={item.name}
                      onChange={(e) => updateItem(index, "name", e.target.value)}
                      className="w-full bg-transparent border-0 text-[#F5F5F4] text-sm focus:outline-none focus:ring-0"
                      placeholder="Nama barang/jasa..."
                    />
                  </td>
                  <td className="px-2 py-2 text-center">
                    <button
                      onClick={() =>
                        updateItem(index, "opt", item.opt === "A" ? "B" : "A")
                      }
                      title={
                        item.opt === "A"
                          ? "Barang — klik untuk ubah ke Jasa"
                          : "Jasa — klik untuk ubah ke Barang"
                      }
                      className={`text-[9px] px-1.5 py-0.5 uppercase font-medium tracking-[0.04em] transition-all duration-150 border ${
                        item.opt === "A"
                          ? "bg-[rgba(5,150,105,0.08)] border-[rgba(5,150,105,0.25)] text-[#059669] hover:bg-[rgba(5,150,105,0.15)]"
                          : "bg-[rgba(217,119,6,0.08)] border-[rgba(217,119,6,0.25)] text-[#D97706] hover:bg-[rgba(217,119,6,0.15)]"
                      }`}
                    >
                      {item.opt === "A" ? "BRG" : "JSA"}
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={item.unitCode || "UM.0018"}
                      onChange={(e) => handleUnitChange(index, e.target.value)}
                      title={item.unitCode}
                      className="w-full bg-transparent text-[#A8A29E] text-xs focus:outline-none focus:text-[#F5F5F4] cursor-pointer"
                    >
                      {UNIT_GROUPS.map((group) => (
                        <optgroup
                          key={group.label}
                          label={group.label}
                          className="bg-[#1C1C1F] text-[#78716C]"
                        >
                          {group.codes.map((code) => (
                            <option
                              key={code}
                              value={code}
                              className="bg-[#1C1C1F] text-[#F5F5F4]"
                            >
                              {UNIT_CODE_NAMES[code]} ({code})
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(index, "quantity", Number(e.target.value))
                      }
                      className="w-14 bg-transparent border-0 text-[#F5F5F4] text-sm text-right focus:outline-none focus:ring-0"
                      style={{ fontFamily: "var(--font-jetbrains)" }}
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) =>
                        updateItem(index, "unitPrice", Number(e.target.value))
                      }
                      className="w-20 bg-transparent border-0 text-[#F5F5F4] text-sm text-right focus:outline-none focus:ring-0"
                      style={{ fontFamily: "var(--font-jetbrains)" }}
                    />
                  </td>
                  <td
                    className="px-3 py-2 text-right text-[#A8A29E]"
                    style={{ fontFamily: "var(--font-jetbrains)" }}
                  >
                    {formatCurrency(data.trxCode === "04" ? calculateDppNilaiLain(item.taxBase, data.originalVatRate || 11) : item.taxBase)}
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
              {data.items.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-6 text-center text-sm text-[#78716C]"
                  >
                    Belum ada item — klik &quot;Tambah Item&quot; untuk menambahkan
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Ringkasan Total ─────────────────────────────────────────── */}
      <div className="border-t border-[rgba(168,162,158,0.1)] pt-6 space-y-3">
        {data.retensiPct && data.retensiPct > 0 && (
          <div className="mb-4 p-3 bg-[rgba(5,150,105,0.07)] border border-[rgba(5,150,105,0.2)]">
            <p className="text-[11px] uppercase tracking-[0.05em] font-medium text-[#059669] mb-1">
              Penagihan Retensi / DP {data.retensiPct}% Diterapkan
            </p>
            <p className="text-xs text-[#A8A29E]" style={{ fontFamily: "var(--font-jetbrains)" }}>
              DPP per item = Harga Asli × {data.retensiPct}% — Total DPP: Rp {formatCurrency(data.subtotal)}
            </p>
          </div>
        )}
        {data.mosValue && data.mosValue > 0 && (
          <div className="mb-4 p-3 bg-[rgba(217,119,6,0.08)] border border-[rgba(217,119,6,0.2)]">
            <p className="text-[11px] uppercase tracking-[0.05em] font-medium text-[#D97706] mb-1">
              Diskon MOS (Memo of Sales) Diterapkan
            </p>
            <p
              className="text-xs text-[#A8A29E]"
              style={{ fontFamily: "var(--font-jetbrains)" }}
            >
              Diskon: DPP disesuaikan ke Rp {formatCurrency(data.mosValue)}
            </p>
          </div>
        )}
        <div className="flex justify-between items-center">
          <span className="text-sm text-[#78716C]">Subtotal (DPP)</span>
          <span className="text-[#A8A29E]" style={{ fontFamily: "var(--font-jetbrains)" }}>
            Rp {formatCurrency(data.subtotal)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-[#78716C]">PPN (12%)</span>
          <span className="text-[#D97706]" style={{ fontFamily: "var(--font-jetbrains)" }}>
            Rp {formatCurrency(data.totalVat)}
          </span>
        </div>
        <div className="flex justify-between items-center pt-2 border-t border-[rgba(168,162,158,0.1)]">
          <span className="text-base font-semibold text-[#F5F5F4]">Total Keseluruhan</span>
          <span
            className="text-lg font-semibold text-[#F5F5F4]"
            style={{ fontFamily: "var(--font-jetbrains)" }}
          >
            Rp {formatCurrency(data.grandTotal)}
          </span>
        </div>

        {data.trxCode === "04" && (
          <div className="pt-4 mt-4 border-t border-[rgba(168,162,158,0.1)]">
            <p className="text-[11px] uppercase tracking-[0.05em] font-medium text-[#78716C] mb-2">
              Info Coretax — DPP Nilai Lain (Kode 04)
            </p>
            <p
              className="text-xs text-[#A8A29E]"
              style={{ fontFamily: "var(--font-jetbrains)" }}
            >
              DPP Nilai Lain = {formatCurrency(data.subtotal)} × 12/12 = Rp{" "}
              {formatCurrency(data.subtotal)}
            </p>
            <p className="text-xs text-[#78716C] mt-1">
              Tarif PPN 12% — basis DPP sama dengan subtotal
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
