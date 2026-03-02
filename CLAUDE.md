# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

dipajak.in is an Indonesian tax invoice (Faktur Pajak) converter that extracts data from invoices (images, PDFs, Excel) using AI and generates Coretax-compliant XML files for e-Faktur bulk upload.

## Commands

```bash
npm run dev    # Start development server on localhost:3000
npm run build  # Production build
npm run lint   # Run ESLint
```

## Architecture

### Core Flow
1. User uploads invoice files (image/PDF/Excel) via `UploadZone`
2. Files are processed sequentially through `/api/parse` endpoint
3. API uses LangChain + OpenAI to extract structured invoice data with Zod validation
4. Extracted data displayed in `InvoiceList` for review/editing
5. User downloads Coretax XML via `generateBulkFakturPKXml()`

### Key Files

- `src/app/page.tsx` - Main page orchestrating upload, processing, and download
- `src/app/api/parse/route.ts` - AI invoice extraction endpoint (LangChain + OpenAI with structured output)
- `src/lib/xml-generator.ts` - Generates Coretax e-Faktur XML format
- `src/lib/schemas.ts` - Zod schemas defining invoice structure (`ExtractedInvoice`, `CompanyProfile`)
- `src/lib/constants.ts` - Coretax unit codes (UM.xxxx) and transaction codes mapping
- `src/lib/file-handlers.ts` - Client-side file reading utilities (Excel parsing via xlsx)
- `src/middleware.ts` - Auth middleware (Supabase session check, redirect ke /login)
- `src/lib/supabase/` - Supabase client factory files (client.ts, server.ts, middleware.ts, auth-context.tsx)
- `src/lib/hooks/` - React hooks (use-company-profiles.ts, use-customers.ts)
- `supabase/schema.sql` - Database schema (4 tables + RLS + set_active_profile function)

### Data Models

**ExtractedInvoice**: Invoice header (number, date, buyer info, VAT rate, transaction code) + line items array

**InvoiceItem**: Line item with Coretax fields (opt A/B for goods/services, unitCode, taxBase, vat)

**CompanyProfile**: Seller info (NPWP 16 digits, IDTKU 22 digits) — stored in Supabase `company_profiles` table

### Coretax XML Specifics

- Transaction code 04 (DPP Nilai Lain) requires conversion: `otherTaxBase = taxBase × originalVatRate/12`
- Buyer without NPWP: use `0000000000000000` for TIN, BuyerDocument must be "TIN"
- Services (Opt=B) should use UM.0033 (Others) if unit unclear

## Auth System (Supabase)

- **Middleware**: `src/middleware.ts` — fungsi bernama `middleware` (bukan `proxy`)
  - Next.js 16 menggunakan nama file `proxy.ts` tapi fungsinya tetap bisa bernama `middleware`
  - Cek session via `supabase.auth.getUser()`, redirect ke `/login` jika tidak login
- **Login**: `src/app/login/page.tsx` — email + password via `supabase.auth.signInWithPassword()`
- **Logout**: `src/app/api/auth/logout/route.ts` — `supabase.auth.signOut()`
- **User management**: lewat Supabase dashboard (tidak ada halaman registrasi publik)
- **Multi-user**: setiap user punya data terpisah via RLS (auth.uid() = user_id)

## Environment

```
OPENAI_API_KEY=...
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJh...
```

## Database (Supabase)

Jalankan `supabase/schema.sql` di SQL Editor Supabase dashboard sebelum pertama kali digunakan.

Tables: `company_profiles`, `customers`, `invoice_sessions`, `invoices`
- Semua tabel aktifkan RLS dengan policy `auth.uid() = user_id`
- `invoices.items` disimpan sebagai JSONB
- DB function `set_active_profile(profile_id)` untuk atomic profile switch

## AI Model

This project uses **`gpt-5-mini`** (OpenAI) as the AI model for invoice extraction in `src/app/api/parse/route.ts`. Do NOT change this model name — it is intentional.

## Reference Data

Sample invoice formats in `coretax/efaktur/` directory for testing
