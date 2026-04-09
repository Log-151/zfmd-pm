import { useState, useEffect, useCallback } from "react";

export interface CustomFieldDef {
  id: number;
  module: string;
  fieldName: string;
  fieldLabel: string;
  fieldType: string;
  options: string | null;
  isRequired: boolean;
  sortOrder: number;
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export function useCustomFieldDefs(module: string) {
  const [defs, setDefs] = useState<CustomFieldDef[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDefs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/field-definitions?module=${module}`, { credentials: "include" });
      const data = await res.json();
      setDefs(data);
    } catch {
      setDefs([]);
    } finally {
      setLoading(false);
    }
  }, [module]);

  useEffect(() => { fetchDefs(); }, [fetchDefs]);

  const addDef = async (def: { fieldLabel: string; fieldType: string; options?: string; isRequired: boolean }) => {
    const res = await fetch(`${BASE}/api/field-definitions`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ module, ...def }),
    });
    if (res.ok) await fetchDefs();
    return res.ok;
  };

  const deleteDef = async (id: number) => {
    await fetch(`${BASE}/api/field-definitions/${id}`, { method: "DELETE", credentials: "include" });
    await fetchDefs();
  };

  return { defs, loading, addDef, deleteDef, refetch: fetchDefs };
}
