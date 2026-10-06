import type { ActionDefinition } from "@w6w/types";
import { encodeId, PhraseClient } from "../lib/client.ts";

/**
 * `GET /v2/projects/{projectId}/translations/{translationId}` — fetch one translation.
 */
interface Input {
  projectId: string;
  translationId: string;
  branch?: string;
}

const translationGet: ActionDefinition<Input> = {
  key: "translation-get",
  type: "read",
  resource: "translation",
  title: "Get Translation",
  description: "Fetch one translation.",
  params: [
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      required: true,
      hint: "Phrase Strings project id (from List Projects, or the project URL).",
    },
    { key: "translationId", label: "Translation ID", type: "string", required: true },
    {
      key: "branch",
      label: "Branch",
      type: "string",
      hint: "Branch name, for projects with branching enabled. Leave empty for the main branch.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Translation ID" },
    { key: "content", type: "string", label: "Content" },
    { key: "unverified", type: "boolean", label: "Unverified" },
    { key: "state", type: "string", label: "State" },
    { key: "key", type: "object", label: "Key" },
    { key: "locale", type: "object", label: "Locale" },
  ],

  execute(input, ctx) {
    return new PhraseClient(ctx).json(
      `/projects/${encodeId(input.projectId)}/translations/${encodeId(input.translationId)}`,
      { method: "GET", query: { branch: input.branch } },
    );
  },
};

export default translationGet;
