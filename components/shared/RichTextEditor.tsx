"use client";

import dynamic from "next/dynamic";
import "react-quill-new/dist/quill.snow.css";

const Quill = dynamic(() => import("react-quill-new"), {
  ssr: false,
  loading: () => (
    <div className="h-48 animate-pulse rounded-b-md border bg-muted" />
  ),
});

const TOOLBAR = [
  [{ header: [1, 2, 3, false] }],
  ["bold", "italic", "underline", "strike"],
  [{ list: "ordered" }, { list: "bullet" }],
  [{ indent: "-1" }, { indent: "+1" }],
  ["link", "clean"],
];

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

export function RichTextEditor({
  value,
  onChange,
  readOnly = false,
}: RichTextEditorProps) {
  return (
    <div className="quill-wrapper overflow-hidden rounded-md border">
      <Quill
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        theme="snow"
        modules={{ toolbar: readOnly ? false : TOOLBAR }}
      />
    </div>
  );
}
