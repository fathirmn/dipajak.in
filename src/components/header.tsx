"use client";

import { Button } from "@/components/ui/button";
import { Settings, Building2, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

interface HeaderProps {
  onOpenSettings: () => void;
  companyName?: string;
}

export function Header({ onOpenSettings, companyName }: HeaderProps) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 bg-[rgba(10,10,11,0.95)] backdrop-blur-md border-b border-[rgba(168,162,158,0.1)]">
      {/* Thin copper accent line at top */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#D97706] to-transparent opacity-60" />

      <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
        <div>
          <h1
            className="text-[1.65rem] tracking-[-0.03em] leading-none"
            style={{ fontFamily: "var(--font-dm-serif)" }}
          >
            <span className="text-[#F5F5F4]">di</span>
            <span className="text-[#D97706]">pajak</span>
            <span className="text-[#F5F5F4]">.in</span>
          </h1>
          <p className="text-[10px] text-[#78716C] mt-1.5 tracking-[0.08em] uppercase">
            Konversi Faktur Pajak → XML Coretax
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Active company badge */}
          {companyName && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-[rgba(5,150,105,0.08)] border border-[rgba(5,150,105,0.2)]">
              <Building2 className="w-3 h-3 text-[#059669]" />
              <span className="text-[10px] text-[#059669] font-medium max-w-[160px] truncate">
                {companyName}
              </span>
            </div>
          )}

          <Button
            variant="ghost"
            onClick={onOpenSettings}
            className="gap-2 border border-[rgba(168,162,158,0.12)] hover:border-[rgba(217,119,6,0.35)] hover:bg-[rgba(217,119,6,0.05)] transition-all duration-200"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="text-[11px] uppercase tracking-[0.06em] font-medium">
              {companyName ? "Profil" : "Profil Perusahaan"}
            </span>
          </Button>

          <Button
            variant="ghost"
            onClick={handleLogout}
            className="gap-2 border border-[rgba(168,162,158,0.12)] hover:border-[rgba(239,68,68,0.35)] hover:bg-[rgba(239,68,68,0.05)] transition-all duration-200"
            title="Keluar"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="text-[11px] uppercase tracking-[0.06em] font-medium hidden sm:inline">
              Keluar
            </span>
          </Button>
        </div>
      </div>
    </header>
  );
}
