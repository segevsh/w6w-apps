import type { ActionDefinition } from "@w6w/types";
import { MindeeClient } from "../lib/client.ts";
import { inferenceIdParam } from "../lib/params.ts";

interface Input {
  inferenceId: string;
}

/** `GET /v2/products/classification/results/{inference_id}`. */
const classificationResultGet: ActionDefinition<Input> = {
  key: "classification-result-get",
  type: "read",
  resource: "classification",
  title: "Get Classification Result",
  description: "Fetch the result of a completed Classification inference.",
  params: [inferenceIdParam],
  output: [
    { key: "inference", type: "object", label: "Inference result" },
  ],

  execute(input, ctx) {
    return new MindeeClient(ctx).json(
      `/v2/products/classification/results/${encodeURIComponent(input.inferenceId)}`,
    );
  },
};

export default classificationResultGet;
