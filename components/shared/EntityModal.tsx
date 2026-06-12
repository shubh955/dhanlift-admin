"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DynamicForm } from "@/components/shared/DynamicForm";
import type { CmsField } from "@/hooks/useCmsConfig";
import { Loader2 } from "lucide-react";

export type ModalMode = "add" | "edit" | "view";

interface EntityModalProps {
  open: boolean;
  onClose: () => void;
  mode: ModalMode;
  fields: CmsField[];
  initialValues?: Record<string, unknown>;
  onSave: (values: Record<string, unknown>) => Promise<void>;
  entityName?: string;
}

export function EntityModal({
  open,
  onClose,
  mode,
  fields,
  initialValues = {},
  onSave,
  entityName = "Item",
}: EntityModalProps) {
  const [values, setValues] = useState<Record<string, unknown>>(initialValues);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form whenever the modal opens or initialValues changes
  useEffect(() => {
    setValues(initialValues);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, JSON.stringify(initialValues)]);

  function handleChange(field: string, value: unknown) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    const missing = fields
      .filter((f) => f.required && !values[f.field])
      .map((f) => f.label);

    if (missing.length > 0) {
      setError(`Required: ${missing.join(", ")}`);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave(values);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const isReadOnly = mode === "view";
  const title =
    mode === "add"
      ? `Add ${entityName}`
      : mode === "edit"
      ? `Edit ${entityName}`
      : entityName;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <DynamicForm
          fields={fields}
          values={values}
          onChange={handleChange}
          readOnly={isReadOnly}
        />

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {isReadOnly ? "Close" : "Cancel"}
          </Button>
          {!isReadOnly && (
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {saving ? "Saving…" : "Save"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
