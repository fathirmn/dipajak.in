"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CompanyProfile } from "@/lib/schemas";

export interface StoredProfile extends CompanyProfile {
  id: string;
  is_active: boolean;
}

export function useCompanyProfiles() {
  const [profiles, setProfiles] = useState<StoredProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("company_profiles")
      .select("*")
      .order("created_at", { ascending: true });

    if (err) {
      setError(err.message);
    } else {
      setProfiles((data ?? []) as StoredProfile[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const activeProfile = profiles.find((p) => p.is_active) ?? null;

  const saveProfile = async (form: Omit<StoredProfile, "is_active">, isNew: boolean) => {
    const supabase = createClient();

    if (isNew) {
      const { error: err } = await supabase
        .from("company_profiles")
        .insert({
          user_id: (await supabase.auth.getUser()).data.user!.id,
          name: form.name,
          npwp: form.npwp,
          idtku: form.idtku,
          address: form.address,
          email: form.email || null,
          is_active: false,
        });
      if (err) throw new Error(err.message);
    } else {
      const { error: err } = await supabase
        .from("company_profiles")
        .update({
          name: form.name,
          npwp: form.npwp,
          idtku: form.idtku,
          address: form.address,
          email: form.email || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", form.id);
      if (err) throw new Error(err.message);
    }

    // Aktifkan profil yang baru disimpan
    if (!isNew) {
      await activateProfile(form.id);
    } else {
      await reload();
      // Aktifkan profil terakhir yang baru diinsert
      const supabase2 = createClient();
      const { data } = await supabase2
        .from("company_profiles")
        .select("id")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (data) await activateProfile(data.id);
    }
  };

  const activateProfile = async (id: string) => {
    const supabase = createClient();
    const { error: err } = await supabase.rpc("set_active_profile", { profile_id: id });
    if (err) throw new Error(err.message);
    await reload();
  };

  const deleteProfile = async (id: string) => {
    const supabase = createClient();
    const { error: err } = await supabase
      .from("company_profiles")
      .delete()
      .eq("id", id);
    if (err) throw new Error(err.message);
    await reload();
  };

  return {
    profiles,
    activeProfile,
    loading,
    error,
    saveProfile,
    activateProfile,
    deleteProfile,
    reload,
  };
}
