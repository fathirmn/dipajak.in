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
import { Save, Plus, Trash2, Check, Building2, Loader2 } from "lucide-react";
import type { CompanyProfile } from "@/lib/schemas";
import { useCompanyProfiles, type StoredProfile } from "@/lib/hooks/use-company-profiles";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CompanyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (profile: CompanyProfile) => void;
}

const emptyForm: Omit<StoredProfile, "is_active"> = {
  id: "",
  name: "",
  npwp: "",
  idtku: "",
  address: "",
  email: "",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function CompanyModal({ open, onOpenChange, onSave }: CompanyModalProps) {
  const {
    profiles,
    activeProfile,
    loading,
    saveProfile,
    activateProfile,
    deleteProfile,
    reload,
  } = useCompanyProfiles();

  const [form, setForm] = useState<Omit<StoredProfile, "is_active">>(emptyForm);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Inisialisasi form saat modal dibuka
  useEffect(() => {
    if (!open) return;
    reload();
  }, [open, reload]);

  useEffect(() => {
    if (loading) return;
    if (profiles.length === 0) {
      setForm({ ...emptyForm, id: crypto.randomUUID() });
      setIsNew(true);
    } else {
      const active = activeProfile ?? profiles[0];
      setForm({ id: active.id, name: active.name, npwp: active.npwp, idtku: active.idtku, address: active.address, email: active.email ?? "" });
      setIsNew(false);
    }
  }, [loading, profiles, activeProfile]);

  const handleNpwpChange = (value: string) => {
    const npwp = value.replace(/\D/g, "").slice(0, 16);
    setForm((prev) => ({
      ...prev,
      npwp,
      idtku: npwp.length === 16 ? npwp + "000000" : prev.idtku,
    }));
  };

  const handleSelectProfile = (p: StoredProfile) => {
    setForm({ id: p.id, name: p.name, npwp: p.npwp, idtku: p.idtku, address: p.address, email: p.email ?? "" });
    setIsNew(false);
  };

  const handleNewProfile = () => {
    setForm({ ...emptyForm, id: crypto.randomUUID() });
    setIsNew(true);
  };

  const handleSave = async () => {
    setSaveError(null);
    if (form.npwp.length !== 16) { setSaveError("NPWP harus 16 digit"); return; }
    if (!form.name.trim()) { setSaveError("Nama perusahaan wajib diisi"); return; }

    setSaving(true);
    try {
      await saveProfile(form, isNew);
      // Tampilkan profil aktif terbaru
      const saved = profiles.find((p) => p.id === form.id) ?? { ...form, is_active: true };
      onSave(saved);
      onOpenChange(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProfile(id);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Gagal menghapus");
    }
  };

  const handleActivate = async (p: StoredProfile) => {
    try {
      await activateProfile(p.id);
      setForm({ id: p.id, name: p.name, npwp: p.npwp, idtku: p.idtku, address: p.address, email: p.email ?? "" });
      onSave(p);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Gagal mengaktifkan");
    }
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

        {/* ── Loading ── */}
        {loading && (
          <div className="flex items-center justify-center py-8 gap-2 text-[#78716C]">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Memuat profil...</span>
          </div>
        )}

        {!loading && (
          <>
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
                        <p className="text-[10px] text-[#78716C] truncate" style={{ fontFamily: "var(--font-jetbrains)" }}>
                          {p.npwp || "—"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {p.is_active && (
                          <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 bg-[rgba(5,150,105,0.12)] text-[#059669] uppercase tracking-[0.05em]">
                            <Check className="w-2.5 h-2.5" />
                            Aktif
                          </span>
                        )}
                        {!p.is_active && (
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

            <div className="border-t border-[rgba(168,162,158,0.1)]" />

            <p className="text-[10px] uppercase tracking-[0.07em] text-[#78716C] -mb-2">
              {isNew ? "Profil Baru" : "Edit Profil"}
            </p>

            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="text-[11px] uppercase tracking-[0.05em] text-[#78716C]">
                  Nama Perusahaan <span className="text-[#DC2626]">*</span>
                </Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="PT. Example Indonesia" />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] uppercase tracking-[0.05em] text-[#78716C]">
                  NPWP (16 digit) <span className="text-[#DC2626]">*</span>
                </Label>
                <Input value={form.npwp} onChange={(e) => handleNpwpChange(e.target.value)} placeholder="1234567890123456" maxLength={16} style={{ fontFamily: "var(--font-jetbrains)" }} />
                <p className="text-[11px] text-[#78716C]">{form.npwp.length}/16 digit</p>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] uppercase tracking-[0.05em] text-[#78716C]">IDTKU</Label>
                <Input value={form.idtku} onChange={(e) => setForm({ ...form, idtku: e.target.value.replace(/\D/g, "").slice(0, 22) })} placeholder="Otomatis dari NPWP" maxLength={22} style={{ fontFamily: "var(--font-jetbrains)" }} />
                <p className="text-[11px] text-[#78716C]">NPWP + kode cabang 6 digit (default: 000000)</p>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] uppercase tracking-[0.05em] text-[#78716C]">Alamat</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Jl. Contoh No. 123, Jakarta" />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] uppercase tracking-[0.05em] text-[#78716C]">
                  Email <span className="normal-case text-[#78716C]">(Opsional)</span>
                </Label>
                <Input type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="pajak@perusahaan.com" />
              </div>
            </div>

            {saveError && (
              <p className="text-[12px] text-red-400 bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] px-3 py-2">
                {saveError}
              </p>
            )}

            <Button onClick={handleSave} disabled={saving} className="w-full mt-2" size="lg">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {saving ? "Menyimpan..." : isNew ? "Simpan & Aktifkan" : "Perbarui & Aktifkan"}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
