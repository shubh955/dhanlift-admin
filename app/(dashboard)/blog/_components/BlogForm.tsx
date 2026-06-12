"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  AlertCircle,
  ArrowLeft,
  Loader2,
  Save,
  Upload,
  X,
} from "lucide-react";
import { useCmsConfig, type CmsField } from "@/hooks/useCmsConfig";
import { getAccessToken } from "@/lib/tokens";
import { DynamicCKEditor } from "@/components/shared/DynamicCKEditor";
import { blobToServerUrl } from "@/lib/ckeditorBlobMap";

const API = process.env.NEXT_PUBLIC_API_BASE_URL;

// All fields the blog create/update API expects, with safe defaults.
// published_at is intentionally omitted — the backend handles it.
const BLOG_API_DEFAULTS: Record<string, unknown> = {
  title: "",
  slug: "",
  excerpt: "",
  banner_image_url: "",
  content: "",
  author_name: "",
  category: "",
  tags: [],
  is_published: false,
  meta_title: "",
  meta_description: "",
  og_image_url: "",
  og_title: "",
  og_description: "",
  og_type: "",
  twitter_title: "",
  twitter_description: "",
  twitter_image_url: "",
  is_indexed: false,
};

function resolveMediaUrl(url: string): string {
  if (!url) return "";
  if (/^https?:\/\//.test(url) || url.startsWith("data:") || url.startsWith("//")) return url;
  const base = (API ?? "").replace(/\/$/, "");
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
}

// ── Section definitions ───────────────────────────────────────────────────────
// Each section has a title, description, and ordered list of field names.
// Fields not listed here are rendered at the bottom under "Other".

interface Section {
  title: string;
  description: string;
  fields: string[];
}

const SECTIONS: Section[] = [
  {
    title: "Basic Information",
    description: "Core blog post details",
    fields: ["title", "slug", "author_name", "category", "tags", "excerpt", "banner_image_url"],
  },
  {
    title: "Content",
    description: "Blog post body content",
    fields: ["content"],
  },
  {
    title: "SEO",
    description: "Search engine optimisation metadata",
    fields: ["meta_title", "meta_description"],
  },
  {
    title: "Open Graph",
    description: "Controls how the post appears when shared on Facebook / LinkedIn",
    fields: ["og_title", "og_description", "og_type", "og_image_url"],
  },
  {
    title: "Twitter Card",
    description: "Controls how the post appears when shared on Twitter / X",
    fields: ["twitter_title", "twitter_description", "twitter_image_url"],
  },
  {
    title: "Settings",
    description: "Visibility and indexing options",
    fields: ["is_published", "is_indexed"],
  },
];

// Fallback field definitions used when CMS config is unavailable or missing a field
const FALLBACK_FIELD_MAP: Record<string, CmsField> = {
  title:               { field: "title",               label: "Title",                type: "string",   required: true },
  slug:                { field: "slug",                 label: "Slug",                 type: "string",   required: false },
  author_name:         { field: "author_name",          label: "Author Name",          type: "string",   required: false },
  category:            { field: "category",             label: "Category",             type: "string",   required: false },
  tags:                { field: "tags",                 label: "Tags",                 type: "string",   required: false },
  excerpt:             { field: "excerpt",              label: "Excerpt",              type: "textarea", required: false },
  banner_image_url:    { field: "banner_image_url",     label: "Banner Image",         type: "image",    required: false },
  content:             { field: "content",              label: "Content",              type: "html",     required: true },
  meta_title:          { field: "meta_title",           label: "Meta Title",           type: "string",   required: false },
  meta_description:    { field: "meta_description",     label: "Meta Description",     type: "textarea", required: false },
  og_title:            { field: "og_title",             label: "OG Title",             type: "string",   required: false },
  og_description:      { field: "og_description",       label: "OG Description",       type: "textarea", required: false },
  og_type:             { field: "og_type",              label: "OG Type",              type: "string",   required: false },
  og_image_url:        { field: "og_image_url",         label: "OG Image",             type: "image",    required: false },
  twitter_title:       { field: "twitter_title",        label: "Twitter Title",        type: "string",   required: false },
  twitter_description: { field: "twitter_description",  label: "Twitter Description",  type: "textarea", required: false },
  twitter_image_url:   { field: "twitter_image_url",    label: "Twitter Image",        type: "image",    required: false },
  is_published:        { field: "is_published",         label: "Published",            type: "boolean",  required: false },
  is_indexed:          { field: "is_indexed",           label: "Indexed by Search Engines", type: "boolean", required: false },
};

// ── Layout helpers ─────────────────────────────────────────────────────────────

function colSpan(type: string | undefined): string {
  const t = (type ?? "").toLowerCase();
  if (t === "html" || t === "ckeditor") return "col-span-full";
  if (t === "textarea") return "col-span-full md:col-span-2";
  if (t === "file" || t === "image") return "col-span-full";
  return "col-span-1";
}

// ── Validation ─────────────────────────────────────────────────────────────────

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

// ── BlogForm ───────────────────────────────────────────────────────────────────

interface BlogFormProps {
  mode: "add" | "edit" | "view";
  blogId?: number;
}

export function BlogForm({ mode, blogId }: BlogFormProps) {
  const router = useRouter();
  const { config: cmsConfig, loading: cmsLoading } = useCmsConfig("blog");

  const [values, setValues] = useState<Record<string, unknown>>({});
  const [fetchLoading, setFetchLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const isReadOnly = mode === "view";

  // Build the final field map: CMS config entries take priority, fallback fills gaps
  const cmsFieldMap: Record<string, CmsField> = {};
  (cmsConfig?.fields ?? []).forEach((f) => { cmsFieldMap[f.field] = f; });

  // Merge: every key in BLOG_API_DEFAULTS gets a field definition
  const allFieldMap: Record<string, CmsField> = { ...FALLBACK_FIELD_MAP };
  Object.keys(cmsFieldMap).forEach((k) => { allFieldMap[k] = cmsFieldMap[k]; });

  // Load existing blog for edit / view
  useEffect(() => {
    if ((mode === "edit" || mode === "view") && blogId) {
      setFetchLoading(true);
      const token = getAccessToken();
      fetch(`${API}/v1/admin/blogs/${blogId}`, {
        headers: { accept: "application/json", Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((json) => setValues((json.data ?? json) as Record<string, unknown>))
        .catch(() => setGlobalError("Failed to load blog post"))
        .finally(() => setFetchLoading(false));
    }
  }, [mode, blogId]);

  function handleChange(field: string, value: unknown) {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
    }
    if (globalError) setGlobalError(null);
  }

  async function handleSave() {
    const errors: Record<string, string> = {};
    for (const f of Object.values(allFieldMap)) {
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
      const isEdit = mode === "edit" && blogId != null;

      // Merge defaults then form values — every API field is always present
      // published_at is never included
      const payload: Record<string, unknown> = { ...BLOG_API_DEFAULTS, ...values };
      delete payload.published_at;

      // tags must be an array — convert comma-separated string if needed
      const rawTags = payload.tags;
      if (!Array.isArray(rawTags)) {
        payload.tags = rawTags
          ? String(rawTags).split(",").map((t) => t.trim()).filter(Boolean)
          : [];
      }

      // Replace CKEditor data URLs in content with real server URLs before saving
      if (blobToServerUrl.size > 0 && typeof payload.content === "string") {
        let html = payload.content;
        for (const [blob, server] of blobToServerUrl.entries()) {
          html = html.split(blob).join(server);
        }
        payload.content = html;
      }

      const res = await fetch(
        `${API}/v1/admin/blogs${isEdit ? `/${blogId}` : ""}`,
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
      router.push("/blog");
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const pageTitle =
    mode === "add" ? "Add Blog" : mode === "edit" ? "Edit Blog" : "View Blog";
  const pageSubtitle =
    mode === "add"
      ? "Create a new blog post"
      : mode === "edit"
      ? "Update blog post details"
      : "Read-only view of this blog post";

  if (fetchLoading || cmsLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Page header ── */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/blog")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{pageTitle}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{pageSubtitle}</p>
        </div>
      </div>

      {/* ── Global error banner ── */}
      {globalError && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          {globalError}
        </div>
      )}

      {/* ── Sections ── */}
      {SECTIONS.map((section) => {
        const sectionFields = section.fields
          .map((name) => allFieldMap[name])
          .filter(Boolean);

        if (sectionFields.length === 0) return null;

        return (
          <div key={section.title} className="rounded-lg border bg-card shadow-sm">
            <div className="border-b px-6 py-4">
              <h3 className="text-base font-semibold">{section.title}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">{section.description}</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-6">
                {sectionFields.map((field) => (
                  <div key={field.field} className={colSpan(field.type)}>
                    <FieldRenderer
                      field={field}
                      value={values[field.field]}
                      onChange={handleChange}
                      readOnly={isReadOnly}
                      error={fieldErrors[field.field]}
                      onUploadError={setUploadError}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}

      {/* ── Footer actions ── */}
      <div className="flex items-center justify-end gap-3 pb-8">
        <Button variant="outline" onClick={() => router.push("/blog")}>
          {isReadOnly ? "Back" : "Cancel"}
        </Button>
        {mode === "view" && blogId && (
          <Button onClick={() => router.push(`/blog/${blogId}/edit`)}>Edit</Button>
        )}
        {!isReadOnly && (
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {saving ? "Saving…" : "Save"}
          </Button>
        )}
      </div>

      {/* ── CKEditor image upload error popup ── */}
      <AlertDialog open={!!uploadError} onOpenChange={(v) => !v && setUploadError(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Image Upload Failed</AlertDialogTitle>
            <AlertDialogDescription>{uploadError}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setUploadError(null)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
  onUploadError?: (msg: string) => void;
}

function FieldRenderer({
  field,
  value,
  onChange,
  readOnly,
  error,
  onUploadError,
}: FieldRendererProps) {
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

  if (type === "html" || type === "ckeditor") {
    return (
      <div className="space-y-1.5">
        {labelEl}
        <DynamicCKEditor
          value={strVal}
          onChange={(v) => onChange(field.field, v)}
          readOnly={readOnly}
          placeholder={`Enter ${field.label.toLowerCase()}…`}
          onUploadError={onUploadError}
        />
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
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
  // Fresh upload preview (user just picked a file)
  const [localPreview, setLocalPreview] = useState<string>("");
  // Auth-fetched preview for existing URLs (edit / view mode)
  const [authPreview, setAuthPreview] = useState<string>("");
  const blobRef = useRef<string>("");
  const authBlobRef = useRef<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Revoke all blob URLs on unmount
  useEffect(() => {
    return () => {
      if (blobRef.current) URL.revokeObjectURL(blobRef.current);
      if (authBlobRef.current) URL.revokeObjectURL(authBlobRef.current);
    };
  }, []);

  // When an existing server URL is set (edit/view), fetch it with auth headers
  // and create a local blob URL so the browser can display it without CORS/auth issues.
  useEffect(() => {
    if (localPreview) return; // user already has a fresh local preview
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
      .catch(() => {
        // Fall back to the resolved URL — may still work if the server is public
        if (!cancelled) setAuthPreview(resolved);
      });

    return () => { cancelled = true; controller.abort(); };
  }, [currentUrl, localPreview]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (inputRef.current) inputRef.current.value = "";
    setLocalError(null);

    if (!file.type.startsWith("image/")) {
      setLocalError("Please select an image file (JPEG, PNG, WebP, GIF…)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setLocalError("Image must be under 5 MB");
      return;
    }

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
      const url: string = data.url ?? data.data?.url ?? "";
      onChange(url);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Upload failed");
      setLocalPreview("");
      if (blobRef.current) { URL.revokeObjectURL(blobRef.current); blobRef.current = ""; }
      // authPreview still valid (existing server image) — keep it visible
    } finally {
      setUploading(false);
    }
  }

  // Priority: fresh local upload > auth-fetched existing > raw resolved URL
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
