import type { ActionDefinition } from "@w6w/types";
import { encodeId, PhraseClient } from "../lib/client.ts";

/**
 * `PATCH /v2/projects/{projectId}/translations/{translationId}` — change a translation's content or state.
 */
interface Input {
  projectId: string;
  translationId: string;
  content?: string;
  branch?: string;
  pluralSuffix?: string;
  unverified?: boolean;
  excluded?: boolean;
  autotranslate?: boolean;
  reviewed?: boolean;
  minorChange?: boolean;
}

const translationUpdate: ActionDefinition<Input> = {
  key: "translation-update",
  type: "perform",
  resource: "translation",
  title: "Update Translation",
  description: "Change a translation's content or state.",
  idempotent: true,
  params: [
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      required: true,
      hint: "Phrase Strings project id (from List Projects, or the project URL).",
    },
    { key: "translationId", label: "Translation ID", type: "string", required: true },
    { key: "content", label: "Content", type: "text" },
    {
      key: "branch",
      label: "Branch",
      type: "string",
      hint: "Branch name, for projects with branching enabled. Leave empty for the main branch.",
    },
    { key: "pluralSuffix", label: "Plural suffix", type: "string" },
    { key: "unverified", label: "Unverified", type: "boolean" },
    { key: "excluded", label: "Excluded", type: "boolean" },
    { key: "autotranslate", label: "Autotranslate", type: "boolean" },
    { key: "reviewed", label: "Reviewed", type: "boolean" },
    {
      key: "minorChange",
      label: "Minor change",
      type: "boolean",
      hint: "Do not unverify dependent translations.",
    },
  ],
  output: [{ key: "id", type: "string", label: "ID" }],

  execute(input, ctx) {
    return new PhraseClient(ctx).json(
      `/projects/${encodeId(input.projectId)}/translations/${encodeId(input.translationId)}`,
      {
        method: "PATCH",
        body: {
          content: input.content,
          branch: input.branch,
          plural_suffix: input.pluralSuffix,
          unverified: input.unverified,
          excluded: input.excluded,
          autotranslate: input.autotranslate,
          reviewed: input.reviewed,
          minor_change: input.minorChange,
        },
      },
    );
  },
};

export default translationUpdate;
