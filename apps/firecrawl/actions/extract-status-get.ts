import type { ActionDefinition } from "@w6w/types";
import { FirecrawlClient } from "../lib/client.ts";
import { jobIdParam } from "../lib/params.ts";

/**
 * `GET /extract/{id}` — poll an extract job.
 *
 * `status` is one of `completed`, `processing`, `failed`, `cancelled`.
 * `data` carries the extracted JSON matching the requested schema/prompt and
 * is only meaningful once `status` is `completed`; `tokensUsed` is likewise
 * only populated then.
 */
interface Input {
  id: string;
}

const extractStatusGet: ActionDefinition<Input> = {
  key: "extract-status-get",
  type: "read",
  resource: "extract",
  title: "Get Extract Status",
  description: "Poll an extract job and get back the extracted structured data once completed.",
  params: [jobIdParam],
  output: [
    { key: "status", type: "string", label: "Status" },
    { key: "data", type: "object", label: "Extracted data" },
    { key: "tokensUsed", type: "number", label: "Tokens used" },
    { key: "expiresAt", type: "string", label: "Expires at" },
  ],

  execute(input, ctx) {
    return new FirecrawlClient(ctx).json(`/extract/${encodeURIComponent(input.id)}`);
  },
};

export default extractStatusGet;
