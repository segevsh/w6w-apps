import type { ActionDefinition } from "@w6w/types";
import { MindeeClient } from "../lib/client.ts";
import { inferenceIdParam } from "../lib/params.ts";

interface Input {
  inferenceId: string;
}

/**
 * `GET /v2/products/ocr/results/{inference_id}` — `result.pages[]`, each with
 * `content` (full page text) and `words[]` (each word's `content` plus a
 * clockwise `polygon` of relative `[x, y]` points).
 */
const ocrResultGet: ActionDefinition<Input> = {
  key: "ocr-result-get",
  type: "read",
  resource: "ocr",
  title: "Get OCR Result",
  description: "Fetch the result of a completed Raw Text OCR inference.",
  params: [inferenceIdParam],
  output: [
    { key: "inference", type: "object", label: "Inference result" },
  ],

  execute(input, ctx) {
    return new MindeeClient(ctx).json(
      `/v2/products/ocr/results/${encodeURIComponent(input.inferenceId)}`,
    );
  },
};

export default ocrResultGet;
