"use client";

import { useEffect, useState } from "react";
import { getAccessToken } from "@/lib/tokens";

export interface CmsField {
  field: string;
  label: string;
  type: string;
  required?: boolean;
  options?: { label: string; value: string }[];
}

export interface CmsModule {
  module: string;
  fields: CmsField[];
}

// Module-level cache so we only fetch once per session
const cache = new Map<string, CmsModule>();

export function useCmsConfig(module: string) {
  const [config, setConfig] = useState<CmsModule | null>(
    cache.get(module) ?? null
  );
  const [loading, setLoading] = useState(!cache.has(module));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cache.has(module)) return;

    const token = getAccessToken();
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/admin/cms`, {
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${token ?? ""}`,
      },
    })
      .then((r) => r.json())
      .then((data: unknown) => {
        const list: CmsModule[] = Array.isArray(data)
          ? (data as CmsModule[])
          : Array.isArray((data as { data?: CmsModule[] }).data)
          ? (data as { data: CmsModule[] }).data
          : [];

        const found = list.find(
          (m) => m.module?.toLowerCase() === module.toLowerCase()
        );
        if (found) {
          cache.set(module, found);
          setConfig(found);
        } else {
          setError(`No CMS config found for module "${module}"`);
        }
      })
      .catch((err: unknown) =>
        setError(
          err instanceof Error ? err.message : "Failed to load CMS config"
        )
      )
      .finally(() => setLoading(false));
  }, [module]);

  return { config, loading, error };
}
