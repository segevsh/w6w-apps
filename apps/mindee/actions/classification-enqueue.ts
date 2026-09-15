import type { ActionDefinition } from "@w6w/types";
import { MindeeClient } from "../lib/client.ts";
import { buildCommonForm, type CommonEnqueueInput, commonEnqueueParams } from "../lib/enqueue.ts";

/**
 * `POST /v2/products/classification/enqueue` — enqueue a document against a
 * Classification model: a set of document-type classes you define on the
 * Mindee Platform (e.g. `INVOICE`, `RECEIPT`, `DRIVER_LICENSE`), returned as a
 * single `document_type` label per file.
 *
 * Unlike Extraction, Classification's enqueue form carries none of the
 * `raw_text`/`polygon`/`confidence`/`rag`/`text_context`/`data_schema`
 * options — confirmed against the vendor's `UtilityEnqueueForm` schema, shared
 * verbatim by Classification, Crop, OCR and Split.
 */
const classificationEnqueue: ActionDefinition<CommonEnqueueInput> = {
  key: "classification-enqueue",
  type: "perform",
  resource: "classification",
  title: "Enqueue Classification",
  description: "Send a document to a Classification model for asynchronous processing.",
  idempotent: false,
  params: commonEnqueueParams,
  output: [
    { key: "job", type: "object", label: "Enqueued job" },
  ],

  execute(input, ctx) {
    return new MindeeClient(ctx).json("/v2/products/classification/enqueue", {
      method: "POST",
      form: buildCommonForm(input),
    });
  },
};

export default classificationEnqueue;
