import { defineUniversalAsync } from "../lib/universal.ts";

/** `POST /v3/universal-ai/async` - model `ocr/ocr_async/{provider}`. */
interface Input {
  file: string;
  provider: string;
  fallbacks?: string;
  providerParams?: unknown;
  webhookReceiver?: string;
}

export default defineUniversalAsync<Input>({
  key: "ocr-multipage-start",
  title: "Start Multipage OCR",
  description: "Extract text, lines and word positions from a multipage PDF or image.",
  feature: "ocr",
  subfeature: "ocr_async",
  defaultProvider: "amazon",
  providerHint: "Provider such as amazon, microsoft or mistral.",
  params: [
    {
      key: "file",
      label: "File URL or ID",
      type: "string",
      required: true,
      hint: "A public file URL, or a file id from Eden AI Upload File.",
    },
  ],
  buildInput: (i) => ({ file: i.file }),
});
