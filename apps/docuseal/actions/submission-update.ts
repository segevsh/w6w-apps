import type { ActionDefinition } from "@w6w/types";
import { compact, DocuSealClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `PUT /submissions/{id}` — verified against DocuSeal's OpenAPI document
 * (`updateSubmission`, `UpdateSubmissionRequest`). Renames a submission,
 * changes its expiration, or archives/unarchives it — `archived: false` is
 * the documented way back from `submission-archive`.
 */
const submissionUpdate: ActionDefinition = {
  key: "submission-update",
  type: "perform",
  resource: "submission",
  title: "Update a Submission",
  description: "Rename a submission, change its expiration, or archive/unarchive it.",
  idempotent: true,
  params: [
    idParam("Submission ID"),
    { key: "name", label: "Name", type: "string", default: "" },
    {
      key: "expireAt",
      label: "Expires At",
      type: "string",
      default: "",
      hint: "e.g. 2024-09-01 12:00:00 UTC.",
    },
    {
      key: "archived",
      label: "Archived",
      type: "boolean",
      default: "",
      hint: "true archives, false unarchives. Leave unset to not change it.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Submission id" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Whole-submission status" },
    { key: "expire_at", type: "string", label: "Expires at, if set" },
    { key: "archived_at", type: "string", label: "Archived at, if archived" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = Number(p.id);
    if (!Number.isFinite(id)) throw new Error("`id` is required and must be a number.");

    ctx.log("info", "updating a DocuSeal submission", { id });

    return await new DocuSealClient(ctx).request(`/submissions/${id}`, {
      method: "PUT",
      body: compact({
        name: p.name,
        expire_at: p.expireAt,
        archived: typeof p.archived === "boolean" ? p.archived : undefined,
      }),
    });
  },
};

export default submissionUpdate;
