import { defineUniversal } from "../lib/universal.ts";

/** `POST /v3/universal-ai` - model `ocr/ocr/{provider}`. */
interface Input {
  file: string;
  language?: string;
  provider: string;
  fallbacks?: string;
  providerParams?: unknown;
}

export default defineUniversal<Input>({
  key: "ocr-extract",
  title: "Extract Text (OCR)",
  description: "Read text from an image or single-page PDF with a chosen OCR provider.",
  feature: "ocr",
  subfeature: "ocr",
  defaultProvider: "google",
  providerHint: "Provider such as google, amazon, microsoft, mistral, api4ai, ionos or sentisight.",
  params: [
    {
      key: "file",
      label: "File URL or ID",
      type: "string",
      required: true,
      hint: "A public file URL, or a file id from Eden AI Upload File.",
    },
    {
      key: "language",
      label: "Language",
      type: "string",
      hint:
        "Document language code. Some providers cannot detect it and reject a request without one.",
    },
  ],
  buildInput: (i) => ({ file: i.file, language: i.language || undefined }),
  promote: [{ key: "text", type: "string", label: "Extracted text" }, {
    key: "bounding_boxes",
    type: "array",
    label: "Word bounding boxes",
  }],
});
