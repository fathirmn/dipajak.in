-- ============================================================
-- dipajak.in — Supabase Schema
-- Jalankan seluruh file ini di Supabase SQL Editor
-- ============================================================

-- ─── Tabel: company_profiles ─────────────────────────────────────────────────
-- Menggantikan localStorage "dipajak_company_profiles"

CREATE TABLE public.company_profiles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  npwp        CHAR(16) NOT NULL,
  idtku       CHAR(22) NOT NULL,
  address     TEXT NOT NULL DEFAULT '',
  email       TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_company_profiles_user_id ON public.company_profiles(user_id);
-- Hanya boleh 1 profil aktif per user
CREATE UNIQUE INDEX idx_company_profiles_one_active
  ON public.company_profiles(user_id)
  WHERE is_active = true;

-- ─── Tabel: customers ────────────────────────────────────────────────────────
-- Menggantikan localStorage "dipajak_customers" (Buku Pembeli)

CREATE TABLE public.customers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  npwp        CHAR(16) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customers_user_id ON public.customers(user_id);
-- Satu NPWP hanya boleh disimpan sekali per user
CREATE UNIQUE INDEX idx_customers_user_npwp ON public.customers(user_id, npwp);

-- ─── Tabel: invoice_sessions ─────────────────────────────────────────────────
-- Grup batch faktur per sesi upload

CREATE TABLE public.invoice_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoice_sessions_user_id ON public.invoice_sessions(user_id);
CREATE INDEX idx_invoice_sessions_created ON public.invoice_sessions(user_id, created_at DESC);

-- ─── Tabel: invoices ─────────────────────────────────────────────────────────
-- Menggantikan sessionStorage "dipajak_session_invoices"
-- items disimpan sebagai JSONB (array InvoiceItem)

CREATE TABLE public.invoices (
  id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id                   UUID REFERENCES public.invoice_sessions(id) ON DELETE SET NULL,
  file_name                    TEXT NOT NULL,
  -- Header faktur (mapping dari ExtractedInvoice)
  invoice_number               TEXT NOT NULL,
  invoice_date                 DATE NOT NULL,
  buyer_name                   TEXT NOT NULL DEFAULT '',
  buyer_npwp                   TEXT NOT NULL DEFAULT '',
  buyer_address                TEXT NOT NULL DEFAULT '',
  buyer_email                  TEXT NOT NULL DEFAULT '',
  original_vat_rate            SMALLINT NOT NULL DEFAULT 12,
  trx_code                     CHAR(2) NOT NULL DEFAULT '04',
  additional_info              TEXT NOT NULL DEFAULT '',
  supporting_document          TEXT NOT NULL DEFAULT '',
  supporting_document_period   TEXT NOT NULL DEFAULT '',
  facility_stamp               TEXT NOT NULL DEFAULT '',
  buyer_document_type          TEXT NOT NULL DEFAULT 'TIN',
  buyer_country                CHAR(3) NOT NULL DEFAULT 'IND',
  buyer_document_number        TEXT NOT NULL DEFAULT '-',
  mos_value                    BIGINT NOT NULL DEFAULT 0,
  retensi_pct                  NUMERIC(5,2) NOT NULL DEFAULT 0,
  subtotal                     BIGINT NOT NULL DEFAULT 0,
  total_vat                    BIGINT NOT NULL DEFAULT 0,
  grand_total                  BIGINT NOT NULL DEFAULT 0,
  -- Line items sebagai JSONB array
  items                        JSONB NOT NULL DEFAULT '[]',
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX idx_invoices_session  ON public.invoices(session_id);
CREATE INDEX idx_invoices_created  ON public.invoices(user_id, created_at DESC);

-- ─── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE public.company_profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices          ENABLE ROW LEVEL SECURITY;

-- company_profiles
CREATE POLICY "Users lihat profil sendiri"    ON public.company_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert profil sendiri"   ON public.company_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update profil sendiri"   ON public.company_profiles FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete profil sendiri"   ON public.company_profiles FOR DELETE USING (auth.uid() = user_id);

-- customers
CREATE POLICY "Users lihat customer sendiri"  ON public.customers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert customer sendiri" ON public.customers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete customer sendiri" ON public.customers FOR DELETE USING (auth.uid() = user_id);

-- invoice_sessions
CREATE POLICY "Users lihat sesi sendiri"      ON public.invoice_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert sesi sendiri"     ON public.invoice_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete sesi sendiri"     ON public.invoice_sessions FOR DELETE USING (auth.uid() = user_id);

-- invoices
CREATE POLICY "Users lihat faktur sendiri"    ON public.invoices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert faktur sendiri"   ON public.invoices FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update faktur sendiri"   ON public.invoices FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete faktur sendiri"   ON public.invoices FOR DELETE USING (auth.uid() = user_id);

-- ─── Database Function: set_active_profile ───────────────────────────────────
-- Atomic switch: nonaktifkan semua profil user lalu aktifkan yang dipilih

CREATE OR REPLACE FUNCTION public.set_active_profile(profile_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Nonaktifkan semua profil milik user ini
  UPDATE public.company_profiles
  SET is_active = false, updated_at = now()
  WHERE user_id = auth.uid();

  -- Aktifkan profil yang dipilih
  UPDATE public.company_profiles
  SET is_active = true, updated_at = now()
  WHERE id = profile_id AND user_id = auth.uid();
END;
$$;
