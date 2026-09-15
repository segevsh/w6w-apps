import type { ActionDefinition } from "@w6w/types";
import { FirecrawlClient } from "../lib/client.ts";
import { jobIdParam } from "../lib/params.ts";

/**
 * `DELETE /crawl/{id}` — cancel a running crawl. Answers `{"status":
 * "cancelled"}`.
 *
 * `idempotent: true`: cancelling an already-cancelled or already-finished
 * crawl has the same end state either way. A `404` ("Crawl job not found")
 * still surfaces as an error rather than being swallowed — an unknown id is
 * worth knowing about, unlike a repeat cancel of a known one.
 */
interface Input {
  id: string;
}

const crawlCancel: ActionDefinition<Input> = {
  key: "crawl-cancel",
  type: "perform",
  resource: "crawl",
  title: "Cancel Crawl",
  description: "Cancel a running crawl job.",
  idempotent: true,
  params: [jobIdParam],
  output: [
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    ctx.log("info", "cancelling crawl", { id: input.id });
    return new FirecrawlClient(ctx).json(`/crawl/${encodeURIComponent(input.id)}`, {
      method: "DELETE",
    });
  },
};

export default crawlCancel;
