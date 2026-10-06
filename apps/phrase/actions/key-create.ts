import type { ActionDefinition } from "@w6w/types";
import { csv, encodeId, PhraseClient } from "../lib/client.ts";

/**
 * `POST /v2/projects/{projectId}/keys` — create a translation key, optionally with its default-locale content.
 */
interface Input {
  projectId: string;
  name: string;
  branch?: string;
  description?: string;
  tags?: string[] | string;
  plural?: boolean;
  namePlural?: string;
  dataType?: string;
  maxCharactersAllowed?: number;
  unformatted?: boolean;
  defaultTranslationContent?: string;
  autotranslate?: boolean;
}

const keyCreate: ActionDefinition<Input> = {
  key: "key-create",
  type: "perform",
  resource: "key",
  title: "Create Key",
  description: "Create a translation key, optionally with its default-locale content.",
  idempotent: false,
  params: [
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      required: true,
      hint: "Phrase Strings project id (from List Projects, or the project URL).",
    },
    { key: "name", label: "Key name", type: "string", required: true },
    {
      key: "branch",
      label: "Branch",
      type: "string",
      hint: "Branch name, for projects with branching enabled. Leave empty for the main branch.",
    },
    { key: "description", label: "Description", type: "text", hint: "Context for translators." },
    { key: "tags", label: "Tags", type: "string", hint: "Comma-separated tag names." },
    { key: "plural", label: "Plural", type: "boolean" },
    { key: "namePlural", label: "Plural name", type: "string" },
    {
      key: "dataType",
      label: "Data type",
      type: "select",
      options: [
        { value: "string", label: "string" },
        { value: "number", label: "number" },
        { value: "boolean", label: "boolean" },
        { value: "array", label: "array" },
        { value: "markdown", label: "markdown" },
      ],
    },
    {
      key: "maxCharactersAllowed",
      label: "Max characters",
      type: "number",
      validation: { min: 1 },
      hint: "Maximum length of a translation.",
    },
    { key: "unformatted", label: "Unformatted", type: "boolean" },
    {
      key: "defaultTranslationContent",
      label: "Default translation",
      type: "text",
      hint: "Content for the project's default locale.",
    },
    { key: "autotranslate", label: "Autotranslate", type: "boolean" },
  ],
  output: [{ key: "id", type: "string", label: "ID" }],

  execute(input, ctx) {
    return new PhraseClient(ctx).json(`/projects/${encodeId(input.projectId)}/keys`, {
      method: "POST",
      body: {
        name: input.name,
        branch: input.branch,
        description: input.description,
        tags: csv(input.tags),
        plural: input.plural,
        name_plural: input.namePlural,
        data_type: input.dataType,
        max_characters_allowed: input.maxCharactersAllowed,
        unformatted: input.unformatted,
        default_translation_content: input.defaultTranslationContent,
        autotranslate: input.autotranslate,
      },
    });
  },
};

export default keyCreate;
