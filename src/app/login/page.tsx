"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(
          authError.message === "Invalid login credentials"
            ? "Email atau password salah"
            : authError.message
        );
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] flex flex-col items-center justify-center px-4">
      {/* Copper accent top */}
      <div className="fixed top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#D97706] to-transparent opacity-60" />

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1
            className="text-[2.2rem] tracking-[-0.03em] leading-none"
            style={{ fontFamily: "var(--font-dm-serif)" }}
          >
            <span className="text-[#F5F5F4]">di</span>
            <span className="text-[#D97706]">pajak</span>
            <span className="text-[#F5F5F4]">.in</span>
          </h1>
          <p className="text-[10px] text-[#78716C] mt-2 tracking-[0.08em] uppercase">
            Konversi Faktur Pajak → XML Coretax
          </p>
        </div>

        {/* Card */}
        <div className="bg-[rgba(255,255,255,0.02)] border border-[rgba(168,162,158,0.12)] p-8">
          <p className="text-[11px] text-[#78716C] uppercase tracking-[0.1em] mb-6">
            Masuk ke Akun
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] text-[#A8A29E] uppercase tracking-[0.06em] mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(168,162,158,0.15)] text-[#F5F5F4] text-sm px-3 py-2.5 outline-none focus:border-[rgba(217,119,6,0.5)] transition-colors placeholder:text-[#57534E]"
                placeholder="email@contoh.com"
              />
            </div>

            <div>
              <label className="block text-[11px] text-[#A8A29E] uppercase tracking-[0.06em] mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(168,162,158,0.15)] text-[#F5F5F4] text-sm px-3 py-2.5 outline-none focus:border-[rgba(217,119,6,0.5)] transition-colors placeholder:text-[#57534E]"
                placeholder="Masukkan password"
              />
            </div>

            {error && (
              <p className="text-[12px] text-red-400 bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 bg-[#D97706] hover:bg-[#B45309] disabled:opacity-50 disabled:cursor-not-allowed text-[#0A0A0B] text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors duration-200"
            >
              {loading ? "Memverifikasi..." : "Masuk"}
            </button>
          </form>
        </div>

        <p className="text-center text-[10px] text-[#57534E] mt-6">
          © {new Date().getFullYear()} dipajak.in
        </p>
      </div>
    </div>
  );
}
