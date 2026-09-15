import type { ActionDefinition } from "@w6w/types";
import { MindeeClient } from "../lib/client.ts";
import { buildCommonForm, type CommonEnqueueInput, commonEnqueueParams } from "../lib/enqueue.ts";

/**
 * `POST /v2/products/crop/enqueue` — enqueue a document against a Crop model:
 * detects and returns cropping coordinates for object classes you define
 * (e.g. isolating a photo or signature region within a page).
 *
 * Shares the plain `UtilityEnqueueForm` shape with Classification, OCR and
 * Split — no `raw_text`/`polygon`/`confidence`/`rag` options.
 */
const cropEnqueue: ActionDefinition<CommonEnqueueInput> = {
  key: "crop-enqueue",
  type: "perform",
  resource: "crop",
  title: "Enqueue Crop",
  description: "Send a document to a Crop model for asynchronous processing.",
  idempotent: false,
  params: commonEnqueueParams,
  output: [
    { key: "job", type: "object", label: "Enqueued job" },
  ],

  execute(input, ctx) {
    return new MindeeClient(ctx).json("/v2/products/crop/enqueue", {
      method: "POST",
      form: buildCommonForm(input),
    });
  },
};

export default cropEnqueue;
