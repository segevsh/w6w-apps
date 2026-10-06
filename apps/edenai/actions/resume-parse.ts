import { defineUniversal } from "../lib/universal.ts";

/** `POST /v3/universal-ai` - model `ocr/resume_parser/{provider}`. */
interface Input {
  file: string;
  provider: string;
  fallbacks?: string;
  providerParams?: unknown;
}

export default defineUniversal<Input>({
  key: "resume-parse",
  title: "Parse Resume",
  description: "Extract structured candidate data from a resume or CV.",
  feature: "ocr",
  subfeature: "resume_parser",
  defaultProvider: "affinda",
  providerHint: "Provider such as affinda, extracta, klippa, openai or senseloaf.",
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
  promote: [],
});
