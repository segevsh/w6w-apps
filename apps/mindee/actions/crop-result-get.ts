import type { ActionDefinition } from "@w6w/types";
import { MindeeClient } from "../lib/client.ts";
import { inferenceIdParam } from "../lib/params.ts";

interface Input {
  inferenceId: string;
}

/** `GET /v2/products/crop/results/{inference_id}`. */
const cropResultGet: ActionDefinition<Input> = {
  key: "crop-result-get",
  type: "read",
  resource: "crop",
  title: "Get Crop Result",
  description: "Fetch the result of a completed Crop inference.",
  params: [inferenceIdParam],
  output: [
    { key: "inference", type: "object", label: "Inference result" },
  ],

  execute(input, ctx) {
    return new MindeeClient(ctx).json(
      `/v2/products/crop/results/${encodeURIComponent(input.inferenceId)}`,
    );
  },
};

export default cropResultGet;
