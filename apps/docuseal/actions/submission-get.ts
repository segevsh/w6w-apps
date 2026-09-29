import type { ActionDefinition } from "@w6w/types";
import { DocuSealClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `GET /submissions/{id}` — verified against DocuSeal's OpenAPI document
 * (`getSubmission`). Returns every submitter's individual state alongside
 * the submission — `status` reflects the WHOLE submission (`completed` only
 * once every submitter has signed), so a caller waiting on one specific
 * person should read `submitters[].status` instead of polling this for a
 * change that may never come if another submitter is the one still pending.
 */
const submissionGet: ActionDefinition = {
  key: "submission-get",
  type: "read",
  resource: "submission",
  title: "Get a Submission",
  description: "Read one submission — its submitters, documents, and events.",
  params: [idParam("Submission ID")],
  output: [
    { key: "id", type: "number", label: "Submission id" },
    { key: "status", type: "string", label: "Whole-submission status" },
    { key: "slug", type: "string", label: "Slug" },
    { key: "expire_at", type: "string", label: "Expires at, if set" },
    { key: "completed_at", type: "string", label: "Completed at, if completed" },
    { key: "created_at", type: "string", label: "Created" },
    { key: "submitters", type: "array", label: "Per-submitter state" },
    { key: "documents", type: "array", label: "Completed or signed documents" },
    { key: "submission_events", type: "array", label: "Events" },
  ],

  async execute(input, ctx) {
    const id = Number((input as { id?: unknown }).id);
    if (!Number.isFinite(id)) throw new Error("`id` is required and must be a number.");

    ctx.log("info", "getting a DocuSeal submission", { id });

    return await new DocuSealClient(ctx).request(`/submissions/${id}`);
  },
};

export default submissionGet;
