import type { ActionDefinition } from "@w6w/types";
import { encodeId, PhraseClient } from "../lib/client.ts";

/**
 * `GET /v2/projects/{projectId}/uploads/{uploadId}` — fetch one upload — poll this until `state` leaves `processing`.
 */
interface Input {
  projectId: string;
  uploadId: string;
  branch?: string;
}

const uploadGet: ActionDefinition<Input> = {
  key: "upload-get",
  type: "read",
  resource: "upload",
  title: "Get Upload",
  description: "Fetch one upload \u2014 poll this until `state` leaves `processing`.",
  params: [
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      required: true,
      hint: "Phrase Strings project id (from List Projects, or the project URL).",
    },
    { key: "uploadId", label: "Upload ID", type: "string", required: true },
    {
      key: "branch",
      label: "Branch",
      type: "string",
      hint: "Branch name, for projects with branching enabled. Leave empty for the main branch.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Upload ID" },
    { key: "state", type: "string", label: "State" },
    { key: "filename", type: "string", label: "File name" },
    { key: "summary", type: "object", label: "What the upload changed" },
    { key: "error_message", type: "string", label: "Error, when failed" },
  ],

  execute(input, ctx) {
    return new PhraseClient(ctx).json(
      `/projects/${encodeId(input.projectId)}/uploads/${encodeId(input.uploadId)}`,
      { method: "GET", query: { branch: input.branch } },
    );
  },
};

export default uploadGet;
