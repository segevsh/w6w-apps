import type { ActionDefinition } from "@w6w/types";
import { ApiTemplateClient } from "../lib/client.ts";

interface Input {
  templateId: string;
  data: Record<string, unknown>;
  filename?: string;
  expiration?: number;
  isCmyk?: boolean;
  pdfStandard?: "" | "PDFA1B" | "PDFA2" | "PDFA3";
  meta?: string;
}

interface Output {
  status?: string;
  download_url?: string;
  template_id?: string;
  total_pages?: number;
  transaction_ref?: string;
  [key: string]: unknown;
}

/**
 * POST /v2/create-pdf — render a PDF from a template, filling in its fields
 * from `data`. Runs synchronously (no `webhook_url`/async path modeled here —
 * the sync response already returns a `download_url`).
 */
const createPdf: ActionDefinition<Input, Output> = {
  key: "create-pdf",
  type: "perform",
  resource: "pdf",
  title: "Create PDF",
  description: "Render a PDF from an APITemplate.io template.",
  idempotent: false,
  params: [
    {
      key: "templateId",
      label: "Template ID",
      type: "string",
      required: true,
      hint: "From the APITemplate.io dashboard, or the List Templates action.",
    },
    {
      key: "data",
      label: "Template data",
      type: "json",
      required: true,
      hint: "Field values to fill into the template. Shape depends on the template.",
    },
    {
      key: "filename",
      label: "Filename",
      type: "string",
      hint: "Must end in .pdf.",
    },
    {
      key: "expiration",
      label: "Expiration (minutes)",
      type: "number",
      hint: "How long the generated file stays on the CDN, 0-10080. Omit for the account default.",
      validation: { min: 0, max: 10080, integer: true },
    },
    { key: "isCmyk", label: "CMYK color", type: "boolean", default: false },
    {
      key: "pdfStandard",
      label: "PDF/A standard",
      type: "select",
      options: [
        { value: "", label: "None" },
        { value: "PDFA1B", label: "PDF/A-1b" },
        { value: "PDFA2", label: "PDF/A-2" },
        { value: "PDFA3", label: "PDF/A-3" },
      ],
    },
    {
      key: "meta",
      label: "Meta",
      type: "string",
      hint: "Opaque reference echoed back on the response, e.g. an internal record id.",
    },
  ],
  output: [
    { key: "download_url", type: "string", label: "Download URL" },
    { key: "total_pages", type: "number", label: "Page count" },
    { key: "transaction_ref", type: "string", label: "Transaction reference" },
  ],

  execute(input, ctx) {
    const client = new ApiTemplateClient(ctx);
    return client.request<Output>("/v2/create-pdf", {
      method: "POST",
      query: {
        template_id: input.templateId,
        filename: input.filename,
        expiration: input.expiration,
        is_cmyk: input.isCmyk ? "1" : undefined,
        pdf_standard: input.pdfStandard || undefined,
        meta: input.meta,
      },
      body: input.data,
    });
  },
};

export default createPdf;
