import type { ActionDefinition } from "@w6w/types";
import { encodeId, PhraseClient } from "../lib/client.ts";

/**
 * `POST /v2/projects/{projectId}/translations` — set the translation of a key in a locale.
 */
interface Input {
  projectId: string;
  localeId: string;
  keyId: string;
  content: string;
  branch?: string;
  pluralSuffix?: string;
  unverified?: boolean;
  excluded?: boolean;
  autotranslate?: boolean;
  reviewed?: boolean;
}

const translationCreate: ActionDefinition<Input> = {
  key: "translation-create",
  type: "perform",
  resource: "translation",
  title: "Create Translation",
  description: "Set the translation of a key in a locale.",
  idempotent: false,
  params: [
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      required: true,
      hint: "Phrase Strings project id (from List Projects, or the project URL).",
    },
    { key: "localeId", label: "Locale ID", type: "string", required: true },
    { key: "keyId", label: "Key ID", type: "string", required: true },
    { key: "content", label: "Content", type: "text", required: true },
    {
      key: "branch",
      label: "Branch",
      type: "string",
      hint: "Branch name, for projects with branching enabled. Leave empty for the main branch.",
    },
    {
      key: "pluralSuffix",
      label: "Plural suffix",
      type: "string",
      hint: "`zero`, `one`, `two`, `few`, `many` or `other` for plural keys.",
    },
    { key: "unverified", label: "Unverified", type: "boolean" },
    { key: "excluded", label: "Excluded", type: "boolean" },
    { key: "autotranslate", label: "Autotranslate", type: "boolean" },
    { key: "reviewed", label: "Reviewed", type: "boolean" },
  ],
  output: [{ key: "id", type: "string", label: "ID" }],

  execute(input, ctx) {
    return new PhraseClient(ctx).json(`/projects/${encodeId(input.projectId)}/translations`, {
      method: "POST",
      body: {
        locale_id: input.localeId,
        key_id: input.keyId,
        content: input.content,
        branch: input.branch,
        plural_suffix: input.pluralSuffix,
        unverified: input.unverified,
        excluded: input.excluded,
        autotranslate: input.autotranslate,
        reviewed: input.reviewed,
      },
    });
  },
};

export default translationCreate;
