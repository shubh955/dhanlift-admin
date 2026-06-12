"use client";

import dynamic from "next/dynamic";

export const DynamicCKEditor = dynamic(
  () =>
    import("@/components/shared/CKEditorField").then((m) => ({
      default: m.CKEditorField,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 animate-pulse rounded-md border bg-muted" />
    ),
  }
);
