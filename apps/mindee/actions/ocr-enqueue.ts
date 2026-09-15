import type { ActionDefinition } from "@w6w/types";
import { MindeeClient } from "../lib/client.ts";
import { buildCommonForm, type CommonEnqueueInput, commonEnqueueParams } from "../lib/enqueue.ts";

/**
 * `POST /v2/products/ocr/enqueue` — enqueue a document against a Raw Text OCR
 * model: every word on every page, each with its own bounding polygon and
 * text, plus a full-page text string. This is the literal "OCR a document"
 * product — most users looking for a generic "extract everything" want
 * Extraction's `raw_text` option instead (a single string per page, no
 * per-word positions); this product is for when per-word position data is
 * actually needed.
 *
 * ## A documentation gap this app closes rather than guesses at
 *
 * Mindee's live `openapi.json` (`api-v2.mindee.net/openapi.json`) omits
 * `requestBody` entirely from `POST /v2/products/ocr/enqueue` — every other
 * enqueue route in the document declares it. The gap is confirmed as a spec
 * export artifact, not a different request shape: the same vendor's own
 * `docs.mindee.com/integrations/api-reference/ocr-models.md` embeds this
 * exact route's OpenAPI fragment inline, and it names the identical
 * `UtilityEnqueueForm` schema (`model_id`, `file`, `url`, `file_base64`,
 * `webhook_ids`, `filename`, `alias`) that Classification, Crop and Split
 * declare in the top-level document. This app uses that confirmed shape.
 */
const ocrEnqueue: ActionDefinition<CommonEnqueueInput> = {
  key: "ocr-enqueue",
  type: "perform",
  resource: "ocr",
  title: "Enqueue OCR",
  description: "Send a document to a Raw Text OCR model for asynchronous processing.",
  idempotent: false,
  params: commonEnqueueParams,
  output: [
    { key: "job", type: "object", label: "Enqueued job" },
  ],

  execute(input, ctx) {
    return new MindeeClient(ctx).json("/v2/products/ocr/enqueue", {
      method: "POST",
      form: buildCommonForm(input),
    });
  },
};

export default ocrEnqueue;
