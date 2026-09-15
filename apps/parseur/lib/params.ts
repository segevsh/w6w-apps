import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments and option lists for the Parseur actions.
 *
 * Every enum here is copied verbatim from Parseur's own OpenAPI 3.1 document
 * (`https://api.parseur.com/openapi.json`, fetched 2026-09-15), not inferred.
 */

/** `DocumentStatusEnum`. */
export const documentStatusOptions = [
  { value: "INCOMING", label: "Incoming — received, awaiting processing" },
  { value: "ANALYZING", label: "Analyzing" },
  { value: "PROGRESS", label: "Processing" },
  { value: "PARSEDOK", label: "Processed" },
  { value: "PARSEDKO", label: "Process failed" },
  { value: "QUOTAEXC", label: "Quota exceeded" },
  { value: "SKIPPED", label: "Skipped" },
  { value: "SPLIT", label: "Split" },
  { value: "EXPORTKO", label: "Export failed" },
  { value: "TRANSKO", label: "Post-process failed" },
  { value: "INVALID", label: "Invalid document" },
];

/** `AIEngineEnum`. */
export const aiEngineOptions = [
  { value: "DISABLED", label: "Disabled" },
  { value: "GCP_AI_2", label: "AI Vision engine v3 — understands layout and images" },
  { value: "GCP_AI_2_5", label: "AI Text engine v2.5 — analyzes extracted text" },
  { value: "GCP_AI_3_TXT", label: "AI Text engine v3 — analyzes extracted text" },
];

/** The file extensions `Parser.allowed_extensions` accepts. */
export const allowedExtensionOptions = [
  "bmp",
  "csv",
  "doc",
  "docx",
  "eml",
  "gif",
  "html",
  "ics",
  "jpg",
  "mbox",
  "msg",
  "ods",
  "odt",
  "pdf",
  "png",
  "rtf",
  "tif",
  "txt",
  "xhtml",
  "xls",
  "xlsm",
  "xlsx",
  "xml",
  "zip",
].map((ext) => ({ value: ext, label: `.${ext}` }));

/** `WebhookEventEnum`. */
export const webhookEventOptions = [
  { value: "document.processed", label: "Document processed" },
  { value: "document.processed.flattened", label: "Document processed (flattened)" },
  { value: "document.template_needed", label: "Document needs a template" },
  { value: "document.export_failed", label: "Document export failed" },
  { value: "table.processed", label: "Table processed" },
];

/** `WebhookCategory`. */
export const webhookCategoryOptions = [
  { value: "CUSTOM", label: "Custom" },
  { value: "ZAPIER", label: "Zapier" },
  { value: "MAKE", label: "Make" },
  { value: "FLOW", label: "Power Automate (Flow)" },
  { value: "N8N", label: "n8n" },
];

/** `ExportConfig.type`. */
export const exportConfigTypeOptions = [
  { value: "PARSER", label: "Whole mailbox" },
  { value: "PARSER_FIELD", label: "Single field" },
];

export const mailboxIdParam: Param = {
  key: "mailboxId",
  label: "Mailbox ID",
  type: "string",
  required: true,
  hint: "The numeric mailbox (parser) ID, found in the mailbox's URL in the Parseur app.",
};

export const documentIdParam: Param = {
  key: "documentId",
  label: "Document ID",
  type: "string",
  required: true,
  hint: "The numeric `id` from a document read or list — not the `DocumentID` an upload returns.",
};

export const templateIdParam: Param = {
  key: "templateId",
  label: "Template ID",
  type: "string",
  required: true,
};

export const webhookIdParam: Param = {
  key: "webhookId",
  label: "Webhook ID",
  type: "string",
  required: true,
};

/**
 * The `page` / `page_size` / `search` / `ordering` quartet every list endpoint
 * in this API accepts. `ordering`'s legal values differ per endpoint, so it is
 * passed in rather than hard-coded here.
 */
export function paginationParams(
  orderingOptions?: Array<{ value: string; label: string }>,
): Param[] {
  const params: Param[] = [
    {
      key: "page",
      label: "Page",
      type: "number",
      default: 1,
      validation: { integer: true, min: 1 },
      hint: "Page number. Pages are 1-based.",
    },
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      default: 25,
      validation: { integer: true, min: 1 },
      hint: "Parseur's own default is 25.",
    },
    {
      key: "search",
      label: "Search",
      type: "string",
      hint: "Case-insensitive substring match.",
    },
  ];
  if (orderingOptions) {
    params.push({
      key: "ordering",
      label: "Order by",
      type: "select",
      options: orderingOptions,
      hint: "Prefix a field with - for descending order (already reflected in the choices below).",
    });
  }
  return params;
}

export interface PaginationInput {
  page?: number;
  pageSize?: number;
  search?: string;
  ordering?: string;
}

export function paginationQuery(
  input: PaginationInput,
): Record<string, string | number | undefined> {
  return {
    page: input.page,
    page_size: input.pageSize,
    search: input.search,
    ordering: input.ordering,
  };
}
