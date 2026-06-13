"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { AlertCircle, ArrowLeft, Loader2, Save, Upload, X } from "lucide-react";
import { useCmsConfig, type CmsField } from "@/hooks/useCmsConfig";
import { getAccessToken } from "@/lib/tokens";
import { swalSuccess, swalError } from "@/lib/swal";

const API = process.env.NEXT_PUBLIC_API_BASE_URL;

// Used only when the CMS config endpoint is unavailable
const FALLBACK_FIELDS: CmsField[] = [
  { field: "name",        label: "Name",        type: "string",   required: true },
  { field: "slug",        label: "Slug",        type: "string",   required: false },
  { field: "description", label: "Description", type: "textarea", required: false },
  { field: "icon_url",    label: "Icon",        type: "image",    required: false },
  { field: "is_active",   label: "Active",      type: "boolean",  required: false },
];

// Boolean fields that should initialise to true on add
const BOOLEAN_TRUE_DEFAULTS = new Set(["is_active"]);

function resolveMediaUrl(url: string): string {
  if (!url) return "";
  if (/^https?:\/\//.test(url) || url.startsWith("data:") || url.startsWith("//")) return url;
  const base = (API ?? "").replace(/\/$/, "");
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
}

function colSpan(type: string | undefined): string {
  const t = (type ?? "").toLowerCase();
  if (t === "html" || t === "ckeditor" || t === "textarea" || t === "file" || t === "image") {
    return "col-span-full";
  }
  return "col-span-1";
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateField(field: CmsField, value: unknown): string | null {
  const t = (field.type ?? "").toLowerCase();
  const str = value == null ? "" : String(value).trim();
  if (field.required) {
    if (t === "boolean") return null;
    if (!str) return `${field.label} is required`;
  }
  if (str && t === "email" && !EMAIL_RE.test(str)) return "Enter a valid email address";
  if (str && t === "number" && isNaN(Number(str))) return "Enter a valid number";
  return null;
}

// ── CategoryForm ───────────────────────────────────────────────────────────────

interface CategoryFormProps {
  mode: "add" | "edit" | "view";
  categoryId?: number;
}

export function CategoryForm({ mode, categoryId }: CategoryFormProps) {
  const router = useRouter();
  const { config: cmsConfig, loading: cmsLoading } = useCmsConfig("category");

  // All fields come directly from the CMS — new backend fields appear automatically
  const fields = useMemo<CmsField[]>(
    () => cmsConfig?.fields ?? FALLBACK_FIELDS,
    [cmsConfig]
  );

  const [values, setValues] = useState<Record<string, unknown>>({});
  const [fetchLoading, setFetchLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);

  const isReadOnly = mode === "view";

  // Initialise empty defaults for add mode once fields are available
  useEffect(() => {
    if (mode !== "add") return;
    const defaults: Record<string, unknown> = {};
    fields.forEach((f) => {
      const t = (f.type ?? "").toLowerCase();
      defaults[f.field] = t === "boolean" ? BOOLEAN_TRUE_DEFAULTS.has(f.field) : "";
    });
    setValues(defaults);
  }, [mode, fields]);

  // Fetch existing record for edit / view
  useEffect(() => {
    if ((mode === "edit" || mode === "view") && categoryId) {
      setFetchLoading(true);
      const token = getAccessToken();
      fetch(`${API}/v1/admin/categories/${categoryId}`, {
        headers: { accept: "application/json", Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((json) => setValues((json.data ?? json) as Record<string, unknown>))
        .catch(() => setGlobalError("Failed to load category"))
        .finally(() => setFetchLoading(false));
    }
  }, [mode, categoryId]);

  function handleChange(field: string, value: unknown) {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) setFieldErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
    if (globalError) setGlobalError(null);
  }

  async function handleSave() {
    const errors: Record<string, string> = {};
    for (const f of fields) {
      const err = validateField(f, values[f.field]);
      if (err) errors[f.field] = err;
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setGlobalError("Please fix the highlighted fields before saving.");
      return;
    }

    setSaving(true);
    setGlobalError(null);
    setFieldErrors({});

    try {
      const token = getAccessToken();
      const isEdit = mode === "edit" && categoryId != null;

      // Build payload from every CMS field so nothing is silently omitted
      const payload: Record<string, unknown> = {};
      fields.forEach((f) => {
        const val = values[f.field];
        const t = (f.type ?? "").toLowerCase();
        if (t === "boolean") {
          payload[f.field] = Boolean(val);
        } else {
          const str = val == null ? "" : String(val).trim();
          payload[f.field] = str === "" ? null : val;
        }
      });

      const res = await fetch(
        `${API}/v1/admin/categories${isEdit ? `/${categoryId}` : ""}`,
        {
          method: isEdit ? "PUT" : "POST",
          headers: {
            accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { detail?: string };
        throw new Error(err.detail ?? "Save failed");
      }
      swalSuccess(isEdit ? "Updated!" : "Created!", isEdit ? "Category updated successfully." : "Category created successfully.");
      router.push("/settings");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save";
      setGlobalError(msg);
      swalError("Save Failed", msg);
    } finally {
      setSaving(false);
    }
  }

  const pageTitle =
    mode === "add" ? "Add Category" : mode === "edit" ? "Edit Category" : "View Category";
  const pageSubtitle =
    mode === "add" ? "Create a new category"
    : mode === "edit" ? "Update category details"
    : "Read-only view of this category";

  if (fetchLoading || cmsLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/settings")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{pageTitle}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{pageSubtitle}</p>
        </div>
      </div>

      {/* Global error */}
      {globalError && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          {globalError}
        </div>
      )}

      {/* All CMS fields in one card — rendered in the order the backend defines them */}
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="border-b px-6 py-4">
          <h3 className="text-base font-semibold">Category Details</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Fill in the category information below.
          </p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
            {fields.map((field) => (
              <div key={field.field} className={colSpan(field.type)}>
                <FieldRenderer
                  field={field}
                  value={values[field.field]}
                  onChange={handleChange}
                  readOnly={isReadOnly}
                  error={fieldErrors[field.field]}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-end gap-3 pb-8">
        <Button variant="outline" onClick={() => router.push("/settings")}>
          {isReadOnly ? "Back" : "Cancel"}
        </Button>
        {mode === "view" && categoryId && (
          <Button onClick={() => router.push(`/settings/category/${categoryId}/edit`)}>
            Edit
          </Button>
        )}
        {!isReadOnly && (
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {saving ? "Saving…" : "Save"}
          </Button>
        )}
      </div>
    </div>
  );
}

// ── FieldRenderer ──────────────────────────────────────────────────────────────

interface FieldRendererProps {
  field: CmsField;
  value: unknown;
  onChange: (field: string, value: unknown) => void;
  readOnly: boolean;
  error?: string;
}

function FieldRenderer({ field, value, onChange, readOnly, error }: FieldRendererProps) {
  const strVal = value == null ? "" : String(value);
  const type = (field.type ?? "").toLowerCase();

  const labelEl = (
    <Label htmlFor={field.field} className={error ? "text-destructive" : ""}>
      {field.label}
      {field.required && <span className="ml-1 text-destructive font-medium">*</span>}
    </Label>
  );

  if (type === "boolean") {
    return (
      <div className="flex items-center gap-3 pt-1">
        <Switch
          id={field.field}
          checked={Boolean(value)}
          onCheckedChange={(v) => onChange(field.field, v)}
          disabled={readOnly}
        />
        <Label htmlFor={field.field} className="cursor-pointer select-none">
          {field.label}
          {field.required && <span className="ml-1 text-destructive font-medium">*</span>}
        </Label>
      </div>
    );
  }

  if (type === "file" || type === "image") {
    return (
      <div className="space-y-1.5">
        {labelEl}
        <ImageUploadField
          fieldName={field.field}
          currentUrl={strVal}
          onChange={(url) => onChange(field.field, url)}
          readOnly={readOnly}
        />
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      </div>
    );
  }

  if (type === "textarea" || type === "richtext") {
    return (
      <div className="space-y-1.5">
        {labelEl}
        <Textarea
          id={field.field}
          value={strVal}
          onChange={(e) => onChange(field.field, e.target.value)}
          disabled={readOnly}
          rows={4}
          className={error ? "border-destructive focus-visible:ring-destructive" : ""}
        />
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      </div>
    );
  }

  if (field.options && field.options.length > 0) {
    return (
      <div className="space-y-1.5">
        {labelEl}
        <select
          id={field.field}
          value={strVal}
          onChange={(e) => onChange(field.field, e.target.value)}
          disabled={readOnly}
          className={[
            "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm",
            "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error ? "border-destructive" : "border-input",
          ].join(" ")}
        >
          <option value="">— Select —</option>
          {(field.options as Array<{ label: string; value?: unknown }>).map((opt) => (
            <option key={String(opt.value ?? opt.label)} value={String(opt.value ?? "")}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {labelEl}
      <Input
        id={field.field}
        type={type === "number" ? "number" : type === "email" ? "email" : "text"}
        value={strVal}
        onChange={(e) =>
          onChange(field.field, type === "number" ? e.target.valueAsNumber : e.target.value)
        }
        disabled={readOnly}
        className={error ? "border-destructive focus-visible:ring-destructive" : ""}
      />
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}

// ── ImageUploadField ───────────────────────────────────────────────────────────

function ImageUploadField({
  fieldName,
  currentUrl,
  onChange,
  readOnly,
}: {
  fieldName: string;
  currentUrl: string;
  onChange: (url: string) => void;
  readOnly: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localPreview, setLocalPreview] = useState<string>("");
  const [authPreview, setAuthPreview] = useState<string>("");
  const blobRef = useRef<string>("");
  const authBlobRef = useRef<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (blobRef.current) URL.revokeObjectURL(blobRef.current);
      if (authBlobRef.current) URL.revokeObjectURL(authBlobRef.current);
    };
  }, []);

  useEffect(() => {
    if (localPreview) return;
    if (!currentUrl) {
      if (authBlobRef.current) { URL.revokeObjectURL(authBlobRef.current); authBlobRef.current = ""; }
      setAuthPreview("");
      return;
    }
    const resolved = resolveMediaUrl(currentUrl);
    if (!resolved || resolved.startsWith("data:") || resolved.startsWith("blob:")) {
      setAuthPreview(resolved);
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    const token = getAccessToken();
    fetch(resolved, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((blob) => {
        if (cancelled) return;
        if (authBlobRef.current) URL.revokeObjectURL(authBlobRef.current);
        const url = URL.createObjectURL(blob);
        authBlobRef.current = url;
        setAuthPreview(url);
      })
      .catch(() => { if (!cancelled) setAuthPreview(resolved); });
    return () => { cancelled = true; controller.abort(); };
  }, [currentUrl, localPreview]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (inputRef.current) inputRef.current.value = "";
    setLocalError(null);
    if (!file.type.startsWith("image/")) { setLocalError("Please select an image file (JPEG, PNG, WebP, GIF…)"); return; }
    if (file.size > 5 * 1024 * 1024) { setLocalError("Image must be under 5 MB"); return; }

    if (blobRef.current) URL.revokeObjectURL(blobRef.current);
    const blob = URL.createObjectURL(file);
    blobRef.current = blob;
    setLocalPreview(blob);
    setUploading(true);
    try {
      const token = getAccessToken();
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API}/v1/admin/media`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error(`Upload failed (HTTP ${res.status})`);
      const data = await res.json();
      onChange(data.url ?? data.data?.url ?? "");
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Upload failed");
      setLocalPreview("");
      if (blobRef.current) { URL.revokeObjectURL(blobRef.current); blobRef.current = ""; }
    } finally {
      setUploading(false);
    }
  }

  const displayUrl = localPreview || authPreview || resolveMediaUrl(currentUrl);
  const hasImage = Boolean(displayUrl);

  return (
    <div className="space-y-2">
      {hasImage && (
        <div className="relative rounded-lg overflow-hidden border bg-muted h-48 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={displayUrl} alt="Preview" className="max-h-full max-w-full object-contain" />
          {!readOnly && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setLocalPreview("");
                setAuthPreview("");
                if (blobRef.current) { URL.revokeObjectURL(blobRef.current); blobRef.current = ""; }
                if (authBlobRef.current) { URL.revokeObjectURL(authBlobRef.current); authBlobRef.current = ""; }
              }}
              className="absolute top-2 right-2 rounded-full bg-background/90 border p-1.5 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
      {!readOnly && (
        <label
          htmlFor={`img-${fieldName}`}
          className={[
            "flex items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-4 text-sm",
            "cursor-pointer hover:bg-muted/60 transition-colors",
            uploading ? "opacity-60 pointer-events-none" : "",
          ].join(" ")}
        >
          {uploading ? (
            <><Loader2 className="h-4 w-4 animate-spin" />Uploading…</>
          ) : (
            <>
              <Upload className="h-4 w-4 text-muted-foreground" />
              <span>
                {hasImage ? "Replace image" : "Click to upload image"}
                <span className="ml-1 text-muted-foreground">(max 5 MB)</span>
              </span>
            </>
          )}
          <input
            ref={inputRef}
            id={`img-${fieldName}`}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading}
          />
        </label>
      )}
      {localError && <p className="text-xs text-destructive">{localError}</p>}
    </div>
  );
}
