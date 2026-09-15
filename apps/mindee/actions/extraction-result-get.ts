import type { ActionDefinition } from "@w6w/types";
import { MindeeClient } from "../lib/client.ts";
import { inferenceIdParam } from "../lib/params.ts";

interface Input {
  inferenceId: string;
}

/**
 * `GET /v2/products/extraction/results/{inference_id}` — the completed result
 * of an Extraction inference.
 *
 * `inference_id` is the SAME id the enqueue action's `job.id` returned (Mindee's
 * own SDK polls `get_job(job.id)` and then fetches the result via that job's
 * `result_url`, which resolves to this same route keyed by that id). Calling
 * this before the job reaches `Processed` answers 404.
 *
 * If the model has "Delete extracted data when fetched" enabled, the result is
 * deleted server-side once this route answers — a second call then 404s.
 */
const extractionResultGet: ActionDefinition<Input> = {
  key: "extraction-result-get",
  type: "read",
  resource: "extraction",
  title: "Get Extraction Result",
  description: "Fetch the result of a completed Extraction inference.",
  params: [inferenceIdParam],
  output: [
    { key: "inference", type: "object", label: "Inference result" },
  ],

  execute(input, ctx) {
    return new MindeeClient(ctx).json(
      `/v2/products/extraction/results/${encodeURIComponent(input.inferenceId)}`,
    );
  },
};

export default extractionResultGet;
