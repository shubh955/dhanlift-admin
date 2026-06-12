"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { AlertCircle, Loader2, Pencil, Save } from "lucide-react";
import { useCmsConfig, type CmsField } from "@/hooks/useCmsConfig";
import { getAccessToken } from "@/lib/tokens";

const API = process.env.NEXT_PUBLIC_API_BASE_URL;

// ── Types ─────────────────────────────────────────────────────────────────────

type DayHours = { open: string | null; close: string | null };
type BusinessHours = Record<string, DayHours>;

interface ContactData {
  phone?: string;
  email?: string;
  whatsapp?: string;
  address?: string;
  google_maps_embed?: string;
  social_facebook?: string;
  social_instagram?: string;
  social_linkedin?: string;
  social_twitter?: string;
  business_hours?: BusinessHours;
  [key: string]: unknown;
}

// ── Fallback fields if CMS config unavailable ─────────────────────────────────

const FALLBACK_FIELDS: CmsField[] = [
  { field: "phone",              label: "Phone",              type: "string",   required: false },
  { field: "email",              label: "Email",              type: "string",   required: false },
  { field: "whatsapp",           label: "WhatsApp",           type: "string",   required: false },
  { field: "address",            label: "Address",            type: "textarea", required: false },
  { field: "google_maps_embed",  label: "Google Maps Embed",  type: "string",   required: false },
  { field: "social_facebook",    label: "Facebook URL",       type: "string",   required: false },
  { field: "social_instagram",   label: "Instagram URL",      type: "string",   required: false },
  { field: "social_linkedin",    label: "LinkedIn URL",       type: "string",   required: false },
  { field: "social_twitter",     label: "Twitter URL",        type: "string",   required: false },
];

// ── Section groupings for the view layout ─────────────────────────────────────

const VIEW_SECTIONS: { title: string; fields: string[] }[] = [
  { title: "Contact Information", fields: ["phone", "email", "whatsapp", "address"] },
  { title: "Map",                 fields: ["google_maps_embed"] },
  { title: "Social Media",        fields: ["social_facebook", "social_instagram", "social_linkedin", "social_twitter"] },
];

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

function dayLabel(d: string) {
  return d.charAt(0).toUpperCase() + d.slice(1);
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ContactPage() {
  const { config: cmsConfig, loading: cmsLoading } = useCmsConfig("contact");

  const [data, setData] = useState<ContactData | null>(null);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, unknown>>({});
  const [editHours, setEditHours] = useState<BusinessHours>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fields: CmsField[] = cmsConfig?.fields ?? FALLBACK_FIELDS;
  const fieldMap: Record<string, CmsField> = {};
  fields.forEach((f) => (fieldMap[f.field] = f));

  const loadContact = useCallback(() => {
    setFetchLoading(true);
    setFetchError(null);
    fetch(`${API}/v1/contact`, { headers: { accept: "application/json" } })
      .then((r) => r.json())
      .then((json) => setData((json.data ?? json) as ContactData))
      .catch(() => setFetchError("Failed to load contact details"))
      .finally(() => setFetchLoading(false));
  }, []);

  useEffect(() => { loadContact(); }, [loadContact]);

  function openEdit() {
    const vals: Record<string, unknown> = {};
    fields.forEach((f) => { vals[f.field] = (data as Record<string, unknown>)?.[f.field] ?? ""; });
    setEditValues(vals);

    // Pre-fill business hours — ensure every day has a slot
    const bh: BusinessHours = {};
    DAYS.forEach((d) => {
      bh[d] = (data?.business_hours?.[d]) ?? { open: null, close: null };
    });
    setEditHours(bh);
    setSaveError(null);
    setEditOpen(true);
  }

  function handleFieldChange(field: string, value: unknown) {
    setEditValues((prev) => ({ ...prev, [field]: value }));
  }

  function handleHourChange(day: string, key: "open" | "close", value: string) {
    setEditHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], [key]: value || null },
    }));
  }

  function setDayClosed(day: string, closed: boolean) {
    setEditHours((prev) => ({
      ...prev,
      [day]: closed ? { open: null, close: null } : { open: "09:00", close: "18:00" },
    }));
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const token = getAccessToken();
      const payload: Record<string, unknown> = { ...editValues, business_hours: editHours };

      const res = await fetch(`${API}/v1/admin/contact`, {
        method: "PUT",
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { detail?: string };
        throw new Error(err.detail ?? `Save failed (HTTP ${res.status})`);
      }

      setEditOpen(false);
      loadContact();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  // ── Loading / error states ──

  if (fetchLoading || cmsLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
        {fetchError}
      </div>
    );
  }

  const contact = data ?? {};

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Contact</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your business contact details and social links
          </p>
        </div>
        <Button onClick={openEdit}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </Button>
      </div>

      {/* ── View sections ── */}
      {VIEW_SECTIONS.map((section) => {
        const sectionFields = section.fields
          .map((name) => fieldMap[name])
          .filter(Boolean);

        if (sectionFields.length === 0) return null;

        return (
          <div key={section.title} className="rounded-lg border bg-card shadow-sm">
            <div className="border-b px-6 py-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {section.title}
              </h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {sectionFields.map((field) => {
                const val = String((contact as Record<string, unknown>)[field.field] ?? "");
                const isMap = field.field === "google_maps_embed";

                return (
                  <div
                    key={field.field}
                    className={isMap ? "col-span-full" : ""}
                  >
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      {field.label}
                    </p>
                    {isMap && val ? (
                      <div className="rounded-lg overflow-hidden border h-64 bg-muted">
                        <iframe
                          src={val}
                          className="w-full h-full"
                          loading="lazy"
                          allowFullScreen
                          title="Google Maps"
                        />
                      </div>
                    ) : val ? (
                      <p className="text-sm break-all">{val}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">—</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* ── Business Hours view ── */}
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="border-b px-6 py-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Business Hours
          </h3>
        </div>
        <div className="p-6">
          <div className="divide-y rounded-lg border overflow-hidden">
            {DAYS.map((day) => {
              const hours = contact.business_hours?.[day];
              const isClosed = !hours?.open && !hours?.close;
              return (
                <div key={day} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="font-medium w-28">{dayLabel(day)}</span>
                  {isClosed ? (
                    <span className="text-muted-foreground italic">Closed</span>
                  ) : (
                    <span className="text-right">
                      {hours?.open ?? "—"} – {hours?.close ?? "—"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Edit Dialog ── */}
      <Dialog open={editOpen} onOpenChange={(v) => { if (!saving) setEditOpen(v); }}>
        <DialogContent className="sm:max-w-[960px] max-h-[90vh] flex flex-col p-0 gap-0">
          {/* Fixed header */}
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <DialogTitle>Edit Contact Details</DialogTitle>
          </DialogHeader>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 min-h-0">
            {saveError && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                {saveError}
              </div>
            )}

            {/* CMS-driven fields grouped by section */}
            {VIEW_SECTIONS.map((section) => {
              const sectionFields = section.fields
                .map((name) => fieldMap[name])
                .filter(Boolean);
              if (sectionFields.length === 0) return null;

              return (
                <div key={section.title}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 pb-1 border-b">
                    {section.title}
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    {sectionFields.map((field) => {
                      const val = String(editValues[field.field] ?? "");
                      const isTextarea =
                        (field.type ?? "").toLowerCase() === "textarea" ||
                        field.field === "address";
                      const isFullWidth = field.field === "address" || field.field === "google_maps_embed";

                      return (
                        <div key={field.field} className={`space-y-1.5${isFullWidth ? " col-span-2" : ""}`}>
                          <Label htmlFor={`edit-${field.field}`}>
                            {field.label}
                          </Label>
                          {isTextarea ? (
                            <Textarea
                              id={`edit-${field.field}`}
                              value={val}
                              onChange={(e) => handleFieldChange(field.field, e.target.value)}
                              rows={3}
                              disabled={saving}
                              className="w-full resize-none"
                            />
                          ) : (
                            <Input
                              id={`edit-${field.field}`}
                              value={val}
                              onChange={(e) => handleFieldChange(field.field, e.target.value)}
                              disabled={saving}
                              className="w-full"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Business Hours editor */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 pb-1 border-b">
                Business Hours
              </p>
              <div className="rounded-lg border divide-y overflow-hidden">
                {DAYS.map((day) => {
                  const hours = editHours[day] ?? { open: null, close: null };
                  const isClosed = !hours.open && !hours.close;

                  return (
                    <div key={day} className="px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                      {/* Day name */}
                      <span className="text-sm font-medium w-24 shrink-0">{dayLabel(day)}</span>

                      {/* Closed toggle */}
                      <label className="flex items-center gap-1.5 text-sm text-muted-foreground cursor-pointer shrink-0 select-none">
                        <input
                          type="checkbox"
                          checked={isClosed}
                          onChange={(e) => setDayClosed(day, e.target.checked)}
                          disabled={saving}
                          className="rounded border-input h-4 w-4 accent-primary"
                        />
                        Closed
                      </label>

                      {/* Time range */}
                      {!isClosed && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <Input
                            type="time"
                            value={hours.open ?? ""}
                            onChange={(e) => handleHourChange(day, "open", e.target.value)}
                            disabled={saving}
                            className="h-8 text-sm w-28"
                          />
                          <span className="text-muted-foreground text-xs shrink-0">to</span>
                          <Input
                            type="time"
                            value={hours.close ?? ""}
                            onChange={(e) => handleHourChange(day, "close", e.target.value)}
                            disabled={saving}
                            className="h-8 text-sm w-28"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Fixed footer */}
          <DialogFooter className="px-6 py-4 border-t shrink-0">
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
