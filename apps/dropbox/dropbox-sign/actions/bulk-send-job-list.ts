import type { ActionDefinition } from "@w6w/types";
import { DropboxSignClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /bulk_send_job/list` — verified against the official OpenAPI document
 * (`bulkSendJobList`).
 *
 * A bulk send fans one template out to many recipients as a single job. This
 * lists the jobs; `bulk-send-job-get` lists the signature requests inside one.
 */
const action: ActionDefinition = {
  key: "bulk-send-job-list",
  type: "read",
  resource: "bulk-send-job",
  title: "List bulk send jobs",
  description: "List bulk send jobs and how many requests each contains.",
  params: [...LIST_PARAMS],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Dropbox Sign bulk send jobs", { returnAll, limit });

    return await new DropboxSignClient(ctx).requestAll(
      "/bulk_send_job/list",
      "bulk_send_jobs",
      {},
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
