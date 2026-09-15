import type { Param } from "@w6w/types";
import { base64ToBytes } from "./client.ts";

/**
 * Fields every `enqueue` route shares, per Mindee's `UtilityEnqueueForm` /
 * extraction enqueue schema (`api-v2.mindee.net/openapi.json`): `model_id`,
 * `file` | `url` | `file_base64`, `webhook_ids`, `filename`, `alias`.
 *
 * Extraction's enqueue form adds its own options on top (`raw_text`,
 * `polygon`, `confidence`, `rag`, `text_context`, `data_schema`) — see
 * `actions/extraction-enqueue.ts`.
 *
 * `file` (raw bytes) is what Mindee's own docs recommend over `file_base64`
 * ("Not recommended, for specific use only" — `integrations/api-reference.md`),
 * so a base64 `file` param is decoded into a `Blob` and sent as the `file`
 * multipart part rather than passed through as `file_base64`.
 */
export interface CommonEnqueueInput {
  modelId: string;
  file?: string;
  url?: string;
  fileName?: string;
  fileMimeType?: string;
  webhookIds?: string[] | string;
  alias?: string;
}

export const commonEnqueueParams: Param[] = [
  {
    key: "modelId",
    label: "Model ID",
    type: "string",
    required: true,
    hint: "UUID of the Mindee model to run. Find it with the Model Search action or on the " +
      "Mindee Platform's Models tab.",
  },
  {
    key: "file",
    label: "File (base64)",
    type: "text",
    hint: "Base64-encoded document bytes (PDF, JPEG, PNG, WebP, TIFF, HEIC/HEIF; 100 MB max). " +
      "Provide this OR `url`, not both.",
  },
  {
    key: "url",
    label: "File URL",
    type: "string",
    hint: "A public HTTPS URL Mindee can fetch directly (no auth headers; query-param auth is " +
      "OK). Mindee does not follow redirects. Provide this OR `file`, not both.",
  },
  { key: "fileName", label: "File name", type: "string", default: "document.pdf" },
  { key: "fileMimeType", label: "File MIME type", type: "string", default: "application/pdf" },
  {
    key: "webhookIds",
    label: "Webhook IDs",
    type: "string",
    repeat: true,
    advanced: true,
    hint: "UUIDs of webhooks already configured on this model in the Mindee Platform. Webhooks " +
      "have no management API — create them on the Platform first.",
  },
  {
    key: "alias",
    label: "Alias",
    type: "string",
    advanced: true,
    hint: "Free-form tag echoed back in the job and result (e.g. your own document ID).",
  },
];

/** Build the multipart body shared by every enqueue route. */
export function buildCommonForm(input: CommonEnqueueInput): FormData {
  if (!input.file && !input.url) {
    throw new Error("Provide either `file` (base64) or `url`.");
  }
  const form = new FormData();
  form.append("model_id", input.modelId);
  if (input.file) {
    form.append(
      "file",
      new Blob([base64ToBytes(input.file)], { type: input.fileMimeType || "application/pdf" }),
      input.fileName || "document.pdf",
    );
  } else if (input.url) {
    form.append("url", input.url);
  }
  const webhookIds = Array.isArray(input.webhookIds)
    ? input.webhookIds
    : typeof input.webhookIds === "string" && input.webhookIds
    ? input.webhookIds.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  for (const id of webhookIds) form.append("webhook_ids", id);
  if (input.alias) form.append("alias", input.alias);
  return form;
}

/** The output fields every enqueue action returns: the vendor's `JobResponse.job`. */
export const jobOutput = [
  { key: "job", type: "object" as const, label: "Enqueued job" },
];
