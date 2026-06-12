"use client";

import { useMemo, useRef } from "react";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import {
  Alignment,
  BlockQuote,
  Bold,
  ClassicEditor,
  Code,
  CodeBlock,
  Essentials,
  FontBackgroundColor,
  FontColor,
  FontSize,
  Heading,
  HorizontalLine,
  Image,
  ImageCaption,
  ImageResize,
  ImageStyle,
  ImageToolbar,
  ImageUpload,
  Indent,
  IndentBlock,
  Italic,
  Link,
  List,
  ListProperties,
  MediaEmbed,
  Paragraph,
  SourceEditing,
  Strikethrough,
  Table,
  TableToolbar,
  Underline,
} from "ckeditor5";
import { getAccessToken } from "@/lib/tokens";
import { blobToServerUrl } from "@/lib/ckeditorBlobMap";
import "ckeditor5/ckeditor5.css";

const API = process.env.NEXT_PUBLIC_API_BASE_URL;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

function resolveAbsoluteUrl(raw: string): string {
  if (!raw) return "";
  if (/^https?:\/\//.test(raw) || raw.startsWith("//")) return raw;
  const base = (API ?? "").replace(/\/$/, "");
  return `${base}${raw.startsWith("/") ? "" : "/"}${raw}`;
}

export interface CKEditorFieldProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  onUploadError?: (msg: string) => void;
}

// Builds a plugin class (without extends Plugin to avoid TS friction) that
// registers a custom upload adapter calling POST /v1/admin/media.
function makeUploadPlugin(onError: (msg: string) => void) {
  return class CustomUploadPlugin {
    static get pluginName() {
      return "CustomUploadPlugin";
    }
    // Depend on FileRepository so CKEditor initialises it first.
    static get requires() {
      return ["FileRepository"];
    }

    private editor: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    constructor(editor: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      this.editor = editor;
    }

    init() {
      this.editor.plugins
        .get("FileRepository")
        .createUploadAdapter = (loader: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
          async upload() {
            const file: File | null = await loader.file;
            if (!file) throw new Error("No file selected");

            if (file.size > MAX_FILE_SIZE) {
              const msg = "Image must be under 5 MB";
              onError(msg);
              throw new Error(msg);
            }

            const token = getAccessToken() ?? "";
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch(`${API}/v1/admin/media`, {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` },
              body: formData,
            });

            if (!res.ok) {
              const msg = `Image upload failed (HTTP ${res.status})`;
              onError(msg);
              throw new Error(msg);
            }

            const data = await res.json();
            const serverUrl = resolveAbsoluteUrl(
              data.url ?? data.data?.url ?? ""
            );

            // Use a base64 data URL for the editor display so the image is
            // always visible regardless of auth or CORS on the media server.
            // Before saving, BlogForm replaces every data URL with serverUrl.
            const dataUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = () => reject(new Error("FileReader failed"));
              reader.readAsDataURL(file);
            });
            blobToServerUrl.set(dataUrl, serverUrl);

            return { default: dataUrl };
          },
          abort() {},
        });
    }
  };
}

const HEADING_OPTIONS = [
  { model: "paragraph", title: "Paragraph", class: "ck-heading_paragraph" },
  {
    model: "heading1",
    view: "h1",
    title: "Heading 1",
    class: "ck-heading_heading1",
  },
  {
    model: "heading2",
    view: "h2",
    title: "Heading 2",
    class: "ck-heading_heading2",
  },
  {
    model: "heading3",
    view: "h3",
    title: "Heading 3",
    class: "ck-heading_heading3",
  },
  {
    model: "heading4",
    view: "h4",
    title: "Heading 4",
    class: "ck-heading_heading4",
  },
];

const TOOLBAR_ITEMS = [
  "heading",
  "|",
  "bold",
  "italic",
  "underline",
  "strikethrough",
  "|",
  "alignment",
  "|",
  "bulletedList",
  "numberedList",
  "outdent",
  "indent",
  "|",
  "link",
  "insertTable",
  "blockQuote",
  "horizontalLine",
  "mediaEmbed",
  "|",
  "insertImage",
  "|",
  "fontSize",
  "fontColor",
  "fontBackgroundColor",
  "|",
  "code",
  "codeBlock",
  "|",
  "sourceEditing",
  "|",
  "undo",
  "redo",
];

const BASE_PLUGINS = [
  Essentials,
  Paragraph,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading,
  Link,
  List,
  ListProperties,
  Table,
  TableToolbar,
  BlockQuote,
  Indent,
  IndentBlock,
  Alignment,
  SourceEditing,
  HorizontalLine,
  Code,
  CodeBlock,
  FontSize,
  FontColor,
  FontBackgroundColor,
  MediaEmbed,
  Image,
  ImageCaption,
  ImageStyle,
  ImageToolbar,
  ImageUpload,
  ImageResize,
];

export function CKEditorField({
  value,
  onChange,
  readOnly = false,
  placeholder,
  onUploadError,
}: CKEditorFieldProps) {
  // Keep callback in a ref so the stable plugin closure always calls latest handler.
  const onErrorRef = useRef(onUploadError);
  onErrorRef.current = onUploadError;

  // Build a stable config object — CKEditor must not get a new config on every render.
  const config = useMemo(() => {
    const uploadPlugin = makeUploadPlugin((msg) => onErrorRef.current?.(msg));

    return {
      licenseKey: "GPL",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      plugins: [...BASE_PLUGINS, uploadPlugin] as any[],
      toolbar: { items: TOOLBAR_ITEMS, shouldNotGroupWhenFull: true },
      placeholder,
      heading: { options: HEADING_OPTIONS },
      table: {
        contentToolbar: ["tableColumn", "tableRow", "mergeTableCells"],
      },
      image: {
        resizeUnit: "%" as const,
        resizeOptions: [
          {
            name: "resizeImage:original",
            value: null,
            label: "Original size",
          },
          { name: "resizeImage:25", value: "25", label: "25%" },
          { name: "resizeImage:50", value: "50", label: "50%" },
          { name: "resizeImage:75", value: "75", label: "75%" },
          { name: "resizeImage:100", value: "100", label: "100%" },
        ],
        toolbar: [
          "imageStyle:inline",
          "imageStyle:block",
          "imageStyle:side",
          "|",
          "toggleImageCaption",
          "imageTextAlternative",
          "|",
          "resizeImage",
        ],
      },
      link: {
        addTargetToExternalLinks: true,
      },
      list: {
        properties: {
          styles: true,
          startIndex: true,
          reversed: true,
        },
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — config must be created once

  return (
    <div className="ck-editor-custom-wrapper">
      <CKEditor
        editor={ClassicEditor}
        data={value || ""}
        disabled={readOnly}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        config={config as any}
        onChange={(_, editor) => onChange(editor.getData())}
      />
    </div>
  );
}
