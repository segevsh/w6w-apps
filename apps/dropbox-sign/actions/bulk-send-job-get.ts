import type { ActionDefinition } from "@w6w/types";
import { DropboxSignClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /bulk_send_job/{bulk_send_job_id}` — verified against the official
 * OpenAPI document (`bulkSendJobGet`).
 *
 * The interesting part of the response is not the job but the signature
 * requests it produced, which is a **paged collection inside the same
 * response** — so this pages over `signature_requests`, exactly like a list
 * endpoint, and returns them alongside the job.
 */
const action: ActionDefinition = {
  key: "bulk-send-job-get",
  type: "read",
  resource: "bulk-send-job",
  title: "Get a bulk send job",
  description: "Retrieve a bulk send job and the signature requests it created.",
  params: [
    {
      key: "bulkSendJobId",
      label: "Bulk Send Job ID",
      type: "string",
      required: true,
      default: "",
    },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "bulk_send_job", type: "object", label: "The job" },
    { key: "signature_requests", type: "array", label: "The requests it created" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.bulkSendJobId ?? "").trim();
    if (!id) throw new Error("`bulkSendJobId` is required");
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);
    const path = `/bulk_send_job/${encodeURIComponent(id)}`;

    ctx.log("info", "getting a Dropbox Sign bulk send job", { id, returnAll, limit });

    const client = new DropboxSignClient(ctx);
    const first = await client.request<{ bulk_send_job?: Record<string, unknown> }>(path, {
      query: { page: 1, page_size: 1 },
    });
    const signatureRequests = await client.requestAll(
      path,
      "signature_requests",
      {},
      returnAll ? Infinity : limit,
    );
    return { bulk_send_job: first?.bulk_send_job, signature_requests: signatureRequests };
  },
};

export default action;
