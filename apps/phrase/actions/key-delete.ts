import type { ActionDefinition } from "@w6w/types";
import { encodeId, PhraseClient } from "../lib/client.ts";

/**
 * `DELETE /v2/projects/{projectId}/keys/{keyId}` — permanently delete a key and all of its translations.
 */
interface Input {
  projectId: string;
  keyId: string;
  branch?: string;
}

const keyDelete: ActionDefinition<Input> = {
  key: "key-delete",
  type: "perform",
  resource: "key",
  title: "Delete Key",
  description: "Permanently delete a key and all of its translations.",
  idempotent: true,
  params: [
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      required: true,
      hint: "Phrase Strings project id (from List Projects, or the project URL).",
    },
    { key: "keyId", label: "Key ID", type: "string", required: true },
    {
      key: "branch",
      label: "Branch",
      type: "string",
      hint: "Branch name, for projects with branching enabled. Leave empty for the main branch.",
    },
  ],
  output: [{ key: "success", type: "boolean", label: "Deleted" }],

  execute(input, ctx) {
    return new PhraseClient(ctx).json(
      `/projects/${encodeId(input.projectId)}/keys/${encodeId(input.keyId)}`,
      { method: "DELETE", query: { branch: input.branch } },
    );
  },
};

export default keyDelete;
