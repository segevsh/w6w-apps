import type { ActionDefinition } from "@w6w/types";
import { encodeId, PhraseClient } from "../lib/client.ts";

/**
 * `GET /v2/projects/{projectId}/keys/{keyId}` — fetch one translation key with its description, tags and plural settings.
 */
interface Input {
  projectId: string;
  keyId: string;
  branch?: string;
}

const keyGet: ActionDefinition<Input> = {
  key: "key-get",
  type: "read",
  resource: "key",
  title: "Get Key",
  description: "Fetch one translation key with its description, tags and plural settings.",
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
  output: [
    { key: "id", type: "string", label: "Key ID" },
    { key: "name", type: "string", label: "Key name" },
    { key: "description", type: "string", label: "Description" },
    { key: "tags", type: "array", label: "Tags" },
    { key: "plural", type: "boolean", label: "Plural key" },
  ],

  execute(input, ctx) {
    return new PhraseClient(ctx).json(
      `/projects/${encodeId(input.projectId)}/keys/${encodeId(input.keyId)}`,
      { method: "GET", query: { branch: input.branch } },
    );
  },
};

export default keyGet;
