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

### Data Models

**ExtractedInvoice**: Invoice header (number, date, buyer info, VAT rate, transaction code) + line items array

**InvoiceItem**: Line item with Coretax fields (opt A/B for goods/services, unitCode, taxBase, vat)

**CompanyProfile**: Seller info (NPWP 16 digits, IDTKU 22 digits) stored in localStorage

### Coretax XML Specifics

- Transaction code 04 (DPP Nilai Lain) requires conversion: `otherTaxBase = taxBase × originalVatRate/12`
- Buyer without NPWP: use `0000000000000000` for TIN, BuyerDocument must be "TIN"
- Services (Opt=B) should use UM.0033 (Others) if unit unclear

## Environment

Requires `OPENAI_API_KEY` in `.env.local`

## Reference Data

Sample invoice formats in `coretax/efaktur/` directory for testing
