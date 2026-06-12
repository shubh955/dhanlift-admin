"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RichTextEditor } from "@/components/shared/RichTextEditor";
import { DynamicCKEditor } from "@/components/shared/DynamicCKEditor";
import type { CmsField } from "@/hooks/useCmsConfig";

interface DynamicFormProps {
  fields: CmsField[];
  values: Record<string, unknown>;
  onChange: (field: string, value: unknown) => void;
  readOnly?: boolean;
}

export function DynamicForm({
  fields,
  values,
  onChange,
  readOnly = false,
}: DynamicFormProps) {
  return (
    <div className="space-y-5">
      {fields.map((field) => (
        <FieldRow
          key={field.field}
          field={field}
          value={values[field.field]}
          onChange={onChange}
          readOnly={readOnly}
        />
      ))}
    </div>
  );
}

function FieldRow({
  field,
  value,
  onChange,
  readOnly,
}: {
  field: CmsField;
  value: unknown;
  onChange: (field: string, value: unknown) => void;
  readOnly: boolean;
}) {
  const strVal = value == null ? "" : String(value);
  const type = field.type?.toLowerCase();

  // Boolean / Switch gets inline label layout
  if (type === "boolean") {
    return (
      <div className="flex items-center gap-3">
        <Switch
          id={field.field}
          checked={Boolean(value)}
          onCheckedChange={(v) => onChange(field.field, v)}
          disabled={readOnly}
        />
        <Label htmlFor={field.field} className="cursor-pointer">
          {field.label}
          {field.required && (
            <span className="ml-1 text-destructive font-medium">*</span>
          )}
        </Label>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={field.field}>
        {field.label}
        {field.required && (
          <span className="ml-1 text-destructive font-medium">*</span>
        )}
      </Label>

      {type === "html" ? (
        <DynamicCKEditor
          value={strVal}
          onChange={(v) => onChange(field.field, v)}
          readOnly={readOnly}
        />
      ) : type === "ckeditor" || type === "richtext" ? (
        <RichTextEditor
          value={strVal}
          onChange={(v) => onChange(field.field, v)}
          readOnly={readOnly}
        />
      ) : type === "textarea" ? (
        <Textarea
          id={field.field}
          value={strVal}
          onChange={(e) => onChange(field.field, e.target.value)}
          disabled={readOnly}
          rows={4}
        />
      ) : type === "number" ? (
        <Input
          id={field.field}
          type="number"
          value={strVal}
          onChange={(e) => onChange(field.field, e.target.valueAsNumber)}
          disabled={readOnly}
        />
      ) : type === "email" ? (
        <Input
          id={field.field}
          type="email"
          value={strVal}
          onChange={(e) => onChange(field.field, e.target.value)}
          disabled={readOnly}
        />
      ) : (
        <Input
          id={field.field}
          type="text"
          value={strVal}
          onChange={(e) => onChange(field.field, e.target.value)}
          disabled={readOnly}
        />
      )}
    </div>
  );
}
