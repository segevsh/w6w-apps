import type { ActionDefinition } from "@w6w/types";
import { DocuSealClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `GET /submissions/{id}/documents` — verified against DocuSeal's OpenAPI
 * document (`getSubmissionDocuments`). Returns just the completed/signed
 * document URLs, without the rest of the submission's metadata — cheaper
 * than `submission-get` when all a workflow needs is the signed files.
 */
const submissionDocumentsGet: ActionDefinition = {
  key: "submission-documents-get",
  type: "read",
  resource: "submission",
  title: "Get Submission Documents",
  description: "Read a submission's completed or signed document URLs.",
  params: [idParam("Submission ID")],
  output: [
    { key: "id", type: "number", label: "Submission id" },
    { key: "documents", type: "array", label: "Completed or signed document URLs" },
  ],

  async execute(input, ctx) {
    const id = Number((input as { id?: unknown }).id);
    if (!Number.isFinite(id)) throw new Error("`id` is required and must be a number.");

    ctx.log("info", "getting DocuSeal submission documents", { id });

    return await new DocuSealClient(ctx).request(`/submissions/${id}/documents`);
  },
};

export default submissionDocumentsGet;
