import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { invoiceToRow } from "@/lib/supabase/invoice-db";
import type { ExtractedInvoice } from "@/lib/schemas";

export const dynamic = "force-dynamic";

// PATCH /api/invoices/[id] — update satu faktur setelah diedit user
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { data } = await req.json() as { data: ExtractedInvoice };

  const row = invoiceToRow(data, "", user.id, "");
  // Hapus field yang tidak boleh diupdate
  const { user_id: _u, session_id: _s, file_name: _f, ...updateFields } = row;

  const { error } = await supabase
    .from("invoices")
    .update({ ...updateFields, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/invoices/[id] — hapus satu faktur
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { error } = await supabase
    .from("invoices")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
