"use client";

import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";

interface HeaderProps {
  onOpenSettings: () => void;
}

export function Header({ onOpenSettings }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-[#0A0A0B] border-b border-[rgba(168,162,158,0.1)]">
      <div className="max-w-6xl mx-auto px-6 py-5 flex justify-between items-center">
        <h1
          className="text-2xl text-[#F5F5F4] tracking-[-0.02em]"
          style={{ fontFamily: "var(--font-dm-serif)" }}
        >
          dipajak.in
        </h1>
        <Button
          variant="ghost"
          onClick={onOpenSettings}
          className="gap-2"
        >
          <Settings className="w-4 h-4" />
          <span className="text-xs uppercase tracking-[0.05em] font-medium">Company Profile</span>
        </Button>
      </div>
    </header>
  );
}
