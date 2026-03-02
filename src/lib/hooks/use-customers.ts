"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export interface SavedCustomer {
  id: string;
  name: string;
  npwp: string;
}

export function useCustomers() {
  const [customers, setCustomers] = useState<SavedCustomer[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("customers")
      .select("id, name, npwp")
      .order("created_at", { ascending: true });

    if (data) setCustomers(data as SavedCustomer[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addCustomer = async (name: string, npwp: string) => {
    const supabase = createClient();
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) throw new Error("Tidak terautentikasi");

    const { error } = await supabase
      .from("customers")
      .insert({ user_id: userId, name, npwp });

    // Abaikan error duplikat NPWP (unique constraint)
    if (error && !error.message.includes("unique")) throw new Error(error.message);
    await load();
  };

  const deleteCustomer = async (id: string) => {
    const supabase = createClient();
    await supabase.from("customers").delete().eq("id", id);
    await load();
  };

  return { customers, loading, addCustomer, deleteCustomer, reload: load };
}
