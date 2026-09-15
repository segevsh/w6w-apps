import type { ActionDefinition } from "@w6w/types";
import { MindeeClient } from "../lib/client.ts";
import { buildCommonForm, type CommonEnqueueInput, commonEnqueueParams } from "../lib/enqueue.ts";

/**
 * `POST /v2/products/split/enqueue` — enqueue a multi-document source file
 * against a Split model: breaks it into page ranges and assigns a class you
 * defined (e.g. `INVOICE`, `RECEIPT`) to each range. Works on single-page
 * files too (the range is always the whole file).
 *
 * Shares the plain `UtilityEnqueueForm` shape with Classification, Crop and
 * OCR — no `raw_text`/`polygon`/`confidence`/`rag` options.
 */
const splitEnqueue: ActionDefinition<CommonEnqueueInput> = {
  key: "split-enqueue",
  type: "perform",
  resource: "split",
  title: "Enqueue Split",
  description: "Send a multi-document file to a Split model for asynchronous processing.",
  idempotent: false,
  params: commonEnqueueParams,
  output: [
    { key: "job", type: "object", label: "Enqueued job" },
  ],

  execute(input, ctx) {
    return new MindeeClient(ctx).json("/v2/products/split/enqueue", {
      method: "POST",
      form: buildCommonForm(input),
    });
  },
};

export default splitEnqueue;
