import type { ActionDefinition } from "@w6w/types";
import { MindeeClient } from "../lib/client.ts";
import { inferenceIdParam } from "../lib/params.ts";

interface Input {
  inferenceId: string;
}

/**
 * `GET /v2/products/split/results/{inference_id}` — `result.splits[]`, each a
 * `{ page_range: [startInclusive0Based, endInclusive0Based], document_type }`.
 */
const splitResultGet: ActionDefinition<Input> = {
  key: "split-result-get",
  type: "read",
  resource: "split",
  title: "Get Split Result",
  description: "Fetch the result of a completed Split inference.",
  params: [inferenceIdParam],
  output: [
    { key: "inference", type: "object", label: "Inference result" },
  ],

  execute(input, ctx) {
    return new MindeeClient(ctx).json(
      `/v2/products/split/results/${encodeURIComponent(input.inferenceId)}`,
    );
  },
};

export default splitResultGet;
