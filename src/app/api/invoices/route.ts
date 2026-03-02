import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { invoiceToRow, rowToInvoice } from "@/lib/supabase/invoice-db";
import type { ExtractedInvoice } from "@/lib/schemas";

export const dynamic = "force-dynamic";

// GET /api/invoices — load sesi terakhir milik user
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Ambil sesi paling terbaru
  const { data: session } = await supabase
    .from("invoice_sessions")
    .select("id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!session) return NextResponse.json({ invoices: [] });

  const { data: rows } = await supabase
    .from("invoices")
    .select("*")
    .eq("session_id", session.id)
    .order("created_at", { ascending: true });

  const invoices = (rows ?? []).map((row) => ({
    id:       row.id as string,
    fileName: row.file_name as string,
    data:     rowToInvoice(row as Record<string, unknown>),
  }));

  return NextResponse.json({ invoices });
}

// POST /api/invoices — simpan batch faktur dalam sesi baru
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { invoices, label } = await req.json() as {
    invoices: Array<{ fileName: string; data: ExtractedInvoice }>;
    label?: string;
  };

  if (!invoices || invoices.length === 0) {
    return NextResponse.json({ error: "Tidak ada faktur untuk disimpan" }, { status: 400 });
  }

  // Buat sesi baru
  const { data: session, error: sessionError } = await supabase
    .from("invoice_sessions")
    .insert({ user_id: user.id, label: label ?? null })
    .select("id")
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: "Gagal membuat sesi" }, { status: 500 });
  }

  const rows = invoices.map((inv) =>
    invoiceToRow(inv.data, inv.fileName, user.id, session.id)
  );

  const { error } = await supabase.from("invoices").insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, sessionId: session.id });
}
