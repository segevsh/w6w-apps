import type { ActionDefinition } from "@w6w/types";
import { encodeId, PhraseClient } from "../lib/client.ts";

/**
 * `GET /v2/projects/{projectId}/locales/{localeId}` — fetch one locale by id or code.
 */
interface Input {
  projectId: string;
  localeId: string;
  branch?: string;
}

const localeGet: ActionDefinition<Input> = {
  key: "locale-get",
  type: "read",
  resource: "locale",
  title: "Get Locale",
  description: "Fetch one locale by id or code.",
  params: [
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      required: true,
      hint: "Phrase Strings project id (from List Projects, or the project URL).",
    },
    { key: "localeId", label: "Locale ID", type: "string", required: true },
    {
      key: "branch",
      label: "Branch",
      type: "string",
      hint: "Branch name, for projects with branching enabled. Leave empty for the main branch.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Locale ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "code", type: "string", label: "Locale code" },
    { key: "default", type: "boolean", label: "Is the default locale" },
  ],

  execute(input, ctx) {
    return new PhraseClient(ctx).json(
      `/projects/${encodeId(input.projectId)}/locales/${encodeId(input.localeId)}`,
      { method: "GET", query: { branch: input.branch } },
    );
  },
};

export default localeGet;
