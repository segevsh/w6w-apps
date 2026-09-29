import type { ActionDefinition } from "@w6w/types";
import { DocuSealClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `GET /submitters/{id}` — verified against DocuSeal's OpenAPI document
 * (`getSubmitter`). One signer's own record and status, without the rest of
 * the submission — the right call for polling a specific person rather than
 * the whole submission.
 */
const submitterGet: ActionDefinition = {
  key: "submitter-get",
  type: "read",
  resource: "submitter",
  title: "Get a Submitter",
  description: "Read one submitter's own status, values, and signed documents.",
  params: [idParam("Submitter ID")],
  output: [
    { key: "id", type: "number", label: "Submitter id" },
    { key: "submission_id", type: "number", label: "Submission id" },
    { key: "email", type: "string", label: "Email" },
    { key: "status", type: "string", label: "This submitter's own status" },
    { key: "role", type: "string", label: "Role" },
    { key: "completed_at", type: "string", label: "Completed at, if completed" },
    { key: "values", type: "array", label: "Pre-filled field values" },
    { key: "documents", type: "array", label: "Signed documents, once completed" },
  ],

  async execute(input, ctx) {
    const id = Number((input as { id?: unknown }).id);
    if (!Number.isFinite(id)) throw new Error("`id` is required and must be a number.");

    ctx.log("info", "getting a DocuSeal submitter", { id });

    return await new DocuSealClient(ctx).request(`/submitters/${id}`);
  },
};

export default submitterGet;
