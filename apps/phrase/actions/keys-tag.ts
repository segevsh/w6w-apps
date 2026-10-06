import type { ActionDefinition } from "@w6w/types";
import { csv, encodeId, PhraseClient } from "../lib/client.ts";

/**
 * `PATCH /v2/projects/{projectId}/keys/tag` — add tags to every key matching a search query.
 */
interface Input {
  projectId: string;
  tags: string[] | string;
  q?: string;
  localeId?: string;
  branch?: string;
}

const keysTag: ActionDefinition<Input> = {
  key: "keys-tag",
  type: "perform",
  resource: "key",
  title: "Tag Keys",
  description: "Add tags to every key matching a search query.",
  idempotent: true,
  params: [
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      required: true,
      hint: "Phrase Strings project id (from List Projects, or the project URL).",
    },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      required: true,
      hint: "Comma-separated tag names to add.",
    },
    {
      key: "q",
      label: "Search query",
      type: "string",
      hint: "Keys to tag. Omit to tag every key in the project/branch \u2014 set it deliberately.",
    },
    { key: "localeId", label: "Locale ID", type: "string" },
    {
      key: "branch",
      label: "Branch",
      type: "string",
      hint: "Branch name, for projects with branching enabled. Leave empty for the main branch.",
    },
  ],
  output: [
    { key: "records_affected", type: "number", label: "Keys changed" },
  ],

  execute(input, ctx) {
    return new PhraseClient(ctx).json(`/projects/${encodeId(input.projectId)}/keys/tag`, {
      method: "PATCH",
      body: { tags: csv(input.tags), q: input.q, locale_id: input.localeId, branch: input.branch },
    });
  },
};

export default keysTag;
