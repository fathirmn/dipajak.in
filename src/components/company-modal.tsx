"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Save, Plus, Trash2, Check, Building2 } from "lucide-react";
import type { CompanyProfile } from "@/lib/schemas";

const ACTIVE_KEY = "dipajak_company_profile";
const PROFILES_KEY = "dipajak_company_profiles";

interface StoredProfile extends CompanyProfile {
  id: string;
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

function loadProfiles(): StoredProfile[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveProfiles(profiles: StoredProfile[]) {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

function loadActiveId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ACTIVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.id ?? null;
  } catch {
    return null;
  }
}

// ─── Public loader (used by page.tsx) ────────────────────────────────────────

export function loadCompanyProfile(): CompanyProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ACTIVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface CompanyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: CompanyProfile | null;
  onSave: (profile: CompanyProfile) => void;
}

const emptyForm: StoredProfile = {
  id: "",
  name: "",
  npwp: "",
  idtku: "",
  address: "",
  email: "",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function CompanyModal({ open, onOpenChange, profile, onSave }: CompanyModalProps) {
  const [profiles, setProfiles] = useState<StoredProfile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [form, setForm] = useState<StoredProfile>(emptyForm);
  const [isNew, setIsNew] = useState(false);

  // Load dari localStorage saat modal dibuka
  useEffect(() => {
    if (!open) return;
    const all = loadProfiles();
    const aid = loadActiveId();
    setProfiles(all);
    setActiveId(aid);

    if (all.length === 0) {
      // Belum ada profil — langsung mode tambah baru
      setForm({ ...emptyForm, id: crypto.randomUUID() });
      setIsNew(true);
    } else {
      // Tampilkan profil aktif, atau profil pertama
      const active = all.find((p) => p.id === aid) ?? all[0];
      setForm(active);
      setIsNew(false);
    }
  }, [open]);

  const handleNpwpChange = (value: string) => {
    const npwp = value.replace(/\D/g, "").slice(0, 16);
    setForm((prev) => ({
      ...prev,
      npwp,
      idtku: npwp.length === 16 ? npwp + "000000" : prev.idtku,
    }));
  };

  const handleSelectProfile = (p: StoredProfile) => {
    setForm(p);
    setIsNew(false);
  };

  const handleNewProfile = () => {
    setForm({ ...emptyForm, id: crypto.randomUUID() });
    setIsNew(true);
  };

  const handleSave = () => {
    if (form.npwp.length !== 16) {
      alert("NPWP harus 16 digit");
      return;
    }
    if (!form.name.trim()) {
      alert("Nama perusahaan wajib diisi");
      return;
    }

    const updated = isNew
      ? [...profiles, form]
      : profiles.map((p) => (p.id === form.id ? form : p));

    saveProfiles(updated);
    setProfiles(updated);

    // Simpan sebagai profil aktif
    localStorage.setItem(ACTIVE_KEY, JSON.stringify(form));
    setActiveId(form.id);
    setIsNew(false);

    onSave(form);
    onOpenChange(false);
  };

  const handleDelete = (id: string) => {
    const updated = profiles.filter((p) => p.id !== id);
    saveProfiles(updated);
    setProfiles(updated);

    if (id === activeId) {
      // Hapus aktif — pindah ke profil lain atau kosong
      if (updated.length > 0) {
        localStorage.setItem(ACTIVE_KEY, JSON.stringify(updated[0]));
        setActiveId(updated[0].id);
        setForm(updated[0]);
      } else {
        localStorage.removeItem(ACTIVE_KEY);
        setActiveId(null);
        setForm({ ...emptyForm, id: crypto.randomUUID() });
        setIsNew(true);
      }
    } else if (form.id === id) {
      // Hapus profil yang sedang diedit tapi bukan aktif
      const fallback = updated.find((p) => p.id === activeId) ?? updated[0];
      if (fallback) setForm(fallback);
      else {
        setForm({ ...emptyForm, id: crypto.randomUUID() });
        setIsNew(true);
      }
    }
  };

  const handleActivate = (p: StoredProfile) => {
    localStorage.setItem(ACTIVE_KEY, JSON.stringify(p));
    setActiveId(p.id);
    setForm(p);
    onSave(p);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Profil Perusahaan</DialogTitle>
          <DialogDescription>
            Kelola profil penjual untuk Faktur Pajak
          </DialogDescription>
        </DialogHeader>

        {/* ── Daftar Profil Tersimpan ── */}
        {profiles.length > 0 && (
          <div className="mt-1">
            <p className="text-[10px] uppercase tracking-[0.07em] text-[#78716C] mb-2">
              Profil Tersimpan
            </p>
            <div className="space-y-1.5">
              {profiles.map((p) => (
                <div
                  key={p.id}
                  className={`flex items-center gap-2 px-3 py-2 border cursor-pointer transition-all duration-150 ${
                    form.id === p.id
                      ? "border-[rgba(217,119,6,0.5)] bg-[rgba(217,119,6,0.07)]"
                      : "border-[rgba(168,162,158,0.12)] hover:border-[rgba(217,119,6,0.3)] hover:bg-[rgba(217,119,6,0.03)]"
                  }`}
                  onClick={() => handleSelectProfile(p)}
                >
                  <Building2 className="w-3.5 h-3.5 text-[#78716C] flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#F5F5F4] truncate">{p.name || "—"}</p>
                    <p
                      className="text-[10px] text-[#78716C] truncate"
                      style={{ fontFamily: "var(--font-jetbrains)" }}
                    >
                      {p.npwp || "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {p.id === activeId && (
                      <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 bg-[rgba(5,150,105,0.12)] text-[#059669] uppercase tracking-[0.05em]">
                        <Check className="w-2.5 h-2.5" />
                        Aktif
                      </span>
                    )}
                    {p.id !== activeId && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleActivate(p); }}
                        className="text-[9px] px-1.5 py-0.5 text-[#78716C] hover:text-[#D97706] border border-[rgba(168,162,158,0.15)] hover:border-[rgba(217,119,6,0.35)] uppercase tracking-[0.05em] transition-colors"
                      >
                        Aktifkan
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                      className="p-1 text-[#78716C] hover:text-[#DC2626] transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Tombol Tambah Profil Baru ── */}
        <button
          onClick={handleNewProfile}
          className={`w-full flex items-center justify-center gap-2 px-3 py-2 border border-dashed transition-all duration-150 text-sm ${
            isNew
              ? "border-[rgba(217,119,6,0.5)] text-[#D97706] bg-[rgba(217,119,6,0.05)]"
              : "border-[rgba(168,162,158,0.2)] text-[#78716C] hover:border-[rgba(217,119,6,0.3)] hover:text-[#D97706]"
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          {isNew ? "Mengisi profil baru..." : "Tambah Profil Baru"}
        </button>

        {/* ── Divider ── */}
        <div className="border-t border-[rgba(168,162,158,0.1)]" />

        {/* ── Form ── */}
        <p className="text-[10px] uppercase tracking-[0.07em] text-[#78716C] -mb-2">
          {isNew ? "Profil Baru" : "Edit Profil"}
        </p>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-[11px] uppercase tracking-[0.05em] text-[#78716C]">
              Nama Perusahaan <span className="text-[#DC2626]">*</span>
            </Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="PT. Example Indonesia"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] uppercase tracking-[0.05em] text-[#78716C]">
              NPWP (16 digit) <span className="text-[#DC2626]">*</span>
            </Label>
            <Input
              value={form.npwp}
              onChange={(e) => handleNpwpChange(e.target.value)}
              placeholder="1234567890123456"
              maxLength={16}
              style={{ fontFamily: "var(--font-jetbrains)" }}
            />
            <p className="text-[11px] text-[#78716C]">{form.npwp.length}/16 digit</p>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] uppercase tracking-[0.05em] text-[#78716C]">
              IDTKU
            </Label>
            <Input
              value={form.idtku}
              onChange={(e) =>
                setForm({ ...form, idtku: e.target.value.replace(/\D/g, "").slice(0, 22) })
              }
              placeholder="Otomatis dari NPWP"
              maxLength={22}
              style={{ fontFamily: "var(--font-jetbrains)" }}
            />
            <p className="text-[11px] text-[#78716C]">NPWP + kode cabang 6 digit (default: 000000)</p>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] uppercase tracking-[0.05em] text-[#78716C]">
              Alamat
            </Label>
            <Input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Jl. Contoh No. 123, Jakarta"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] uppercase tracking-[0.05em] text-[#78716C]">
              Email <span className="normal-case text-[#78716C]">(Opsional)</span>
            </Label>
            <Input
              type="email"
              value={form.email || ""}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="pajak@perusahaan.com"
            />
          </div>
        </div>

        <Button onClick={handleSave} className="w-full mt-2" size="lg">
          <Save className="w-4 h-4 mr-2" />
          {isNew ? "Simpan & Aktifkan" : "Perbarui & Aktifkan"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
