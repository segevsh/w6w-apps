import type { ActionDefinition } from "@w6w/types";
import { DocuSealClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `DELETE /submissions/{id}` — verified against DocuSeal's OpenAPI document
 * (`archiveSubmission`). Archives rather than destroys — the response
 * carries an `archived_at` timestamp. Re-archiving is a harmless no-op, so
 * this is safe to retry.
 */
const submissionArchive: ActionDefinition = {
  key: "submission-archive",
  type: "perform",
  resource: "submission",
  title: "Archive a Submission",
  description: "Archive a submission. Use Update Submission to unarchive it.",
  idempotent: true,
  params: [idParam("Submission ID")],
  output: [
    { key: "id", type: "number", label: "Submission id" },
    { key: "archived_at", type: "string", label: "When it was archived" },
  ],

  async execute(input, ctx) {
    const id = Number((input as { id?: unknown }).id);
    if (!Number.isFinite(id)) throw new Error("`id` is required and must be a number.");

    ctx.log("info", "archiving a DocuSeal submission", { id });

    return await new DocuSealClient(ctx).request(`/submissions/${id}`, { method: "DELETE" });
  },
};

export default submissionArchive;
