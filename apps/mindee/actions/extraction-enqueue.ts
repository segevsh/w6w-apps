import type { ActionDefinition } from "@w6w/types";
import { asJsonText, MindeeClient } from "../lib/client.ts";
import { buildCommonForm, type CommonEnqueueInput, commonEnqueueParams } from "../lib/enqueue.ts";

interface Input extends CommonEnqueueInput {
  rawText?: boolean;
  polygon?: boolean;
  confidence?: boolean;
  rag?: boolean;
  textContext?: string;
  dataSchema?: string;
}

/**
 * `POST /v2/products/extraction/enqueue` (aliased, identically, at
 * `POST /v2/inferences/enqueue`) — enqueue a document against an Extraction
 * model: a data schema you define on the Mindee Platform, returned as
 * `fields` keyed by the schema's own field names.
 *
 * Extraction is the only one of the five products with its own optional
 * feature flags on top of the shared enqueue form:
 * - `raw_text` — also extract the document's full text per page.
 * - `polygon` — also return bounding-box coordinates for each field.
 * - `confidence` — also return a confidence score for each field.
 * - `rag` — use documents uploaded via the RAG-document actions as extraction
 *   context for this model.
 * - `text_context` — free-text hint for this one inference (not stored).
 * - `data_schema` — a JSON override of the model's configured schema for this
 *   one inference; passed through verbatim as a JSON string, since its shape
 *   is a nested field-schema editor's own format and validated server-side.
 *
 * Enqueuing returns a `Job`, never extracted data — poll `job-status-get` (or
 * configure a webhook on the Platform) until `status` is `Processed`, then
 * call `extraction-result-get` with the job's `id`.
 */
const extractionEnqueue: ActionDefinition<Input> = {
  key: "extraction-enqueue",
  type: "perform",
  resource: "extraction",
  title: "Enqueue Extraction",
  description: "Send a document to an Extraction model for asynchronous processing.",
  idempotent: false,
  params: [
    ...commonEnqueueParams,
    {
      key: "rawText",
      label: "Extract raw text",
      type: "boolean",
      advanced: true,
      hint: "Also extract the document's full text into `result.raw_text`.",
    },
    {
      key: "polygon",
      label: "Include field polygons",
      type: "boolean",
      advanced: true,
      hint: "Also return bounding-box coordinates for each extracted field.",
    },
    {
      key: "confidence",
      label: "Include field confidence",
      type: "boolean",
      advanced: true,
      hint: "Also return a confidence score for each extracted field.",
    },
    {
      key: "rag",
      label: "Use RAG",
      type: "boolean",
      advanced: true,
      hint: "Use documents uploaded via the RAG document actions as context for this model.",
    },
    {
      key: "textContext",
      label: "Text context",
      type: "text",
      advanced: true,
      hint: 'Free-text hint for this one inference, e.g. "This document is a receipt".',
    },
    {
      key: "dataSchema",
      label: "Data schema override (JSON)",
      type: "json",
      advanced: true,
      hint: "Override the model's configured data schema for this one inference only.",
    },
  ],
  output: [
    { key: "job", type: "object", label: "Enqueued job" },
  ],

  execute(input, ctx) {
    const form = buildCommonForm(input);
    if (input.rawText !== undefined) form.append("raw_text", String(input.rawText));
    if (input.polygon !== undefined) form.append("polygon", String(input.polygon));
    if (input.confidence !== undefined) form.append("confidence", String(input.confidence));
    if (input.rag !== undefined) form.append("rag", String(input.rag));
    if (input.textContext) form.append("text_context", input.textContext);
    const dataSchema = asJsonText(input.dataSchema, "Data schema override");
    if (dataSchema) form.append("data_schema", dataSchema);

    return new MindeeClient(ctx).json("/v2/products/extraction/enqueue", {
      method: "POST",
      form,
    });
  },
};

export default extractionEnqueue;
