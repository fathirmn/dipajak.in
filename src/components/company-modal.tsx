"use client";

import { useState, useMemo } from "react";
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
import { Save } from "lucide-react";
import type { CompanyProfile } from "@/lib/schemas";

const STORAGE_KEY = "dipajak_company_profile";

interface CompanyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: CompanyProfile | null;
  onSave: (profile: CompanyProfile) => void;
}

const emptyProfile: CompanyProfile = {
  name: "",
  npwp: "",
  idtku: "",
  address: "",
  email: "",
};

export function CompanyModal({ open, onOpenChange, profile, onSave }: CompanyModalProps) {
  const initialData = useMemo(() => profile ?? emptyProfile, [profile]);
  const [formData, setFormData] = useState<CompanyProfile>(initialData);

  const resetForm = () => {
    setFormData(profile ?? emptyProfile);
  };

  const handleNpwpChange = (value: string) => {
    const npwp = value.replace(/\D/g, "").slice(0, 16);
    setFormData((prev) => ({
      ...prev,
      npwp,
      idtku: npwp.length === 16 ? npwp + "000000" : prev.idtku,
    }));
  };

  const handleSave = () => {
    if (formData.npwp.length !== 16) {
      alert("NPWP must be 16 digits");
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
    onSave(formData);
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Company Profile</DialogTitle>
          <DialogDescription>
            Your seller information for Faktur Pajak
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          <div className="space-y-1">
            <Label className="text-[11px] uppercase tracking-[0.05em] text-[#78716C]">
              Company Name
            </Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="PT. Example Indonesia"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] uppercase tracking-[0.05em] text-[#78716C]">
              NPWP (16 digits)
            </Label>
            <Input
              value={formData.npwp}
              onChange={(e) => handleNpwpChange(e.target.value)}
              placeholder="1234567890123456"
              maxLength={16}
              style={{ fontFamily: "var(--font-jetbrains)" }}
            />
            <p className="text-[11px] text-[#78716C] mt-1">
              {formData.npwp.length}/16 digits
            </p>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] uppercase tracking-[0.05em] text-[#78716C]">
              IDTKU
            </Label>
            <Input
              value={formData.idtku}
              onChange={(e) => setFormData({ ...formData, idtku: e.target.value.replace(/\D/g, "").slice(0, 22) })}
              placeholder="Auto-filled from NPWP"
              maxLength={22}
              style={{ fontFamily: "var(--font-jetbrains)" }}
            />
            <p className="text-[11px] text-[#78716C] mt-1">
              NPWP + 6-digit branch code (default: 000000)
            </p>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] uppercase tracking-[0.05em] text-[#78716C]">
              Address
            </Label>
            <Input
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Jl. Example No. 123, Jakarta"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] uppercase tracking-[0.05em] text-[#78716C]">
              Email <span className="normal-case text-[#78716C]">(Optional)</span>
            </Label>
            <Input
              type="email"
              value={formData.email || ""}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="tax@example.com"
            />
          </div>
        </div>

        <Button
          onClick={handleSave}
          className="w-full mt-4"
          size="lg"
        >
          <Save className="w-4 h-4 mr-2" />
          Save Profile
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export function loadCompanyProfile(): CompanyProfile | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
  return null;
}
