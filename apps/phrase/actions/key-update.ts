import type { ActionDefinition } from "@w6w/types";
import { csv, encodeId, PhraseClient } from "../lib/client.ts";

/**
 * `PATCH /v2/projects/{projectId}/keys/{keyId}` — change a key's name, description, tags or plural settings.
 */
interface Input {
  projectId: string;
  keyId: string;
  name?: string;
  branch?: string;
  description?: string;
  tags?: string[] | string;
  plural?: boolean;
  namePlural?: string;
  dataType?: string;
  maxCharactersAllowed?: number;
  unformatted?: boolean;
}

const keyUpdate: ActionDefinition<Input> = {
  key: "key-update",
  type: "perform",
  resource: "key",
  title: "Update Key",
  description: "Change a key's name, description, tags or plural settings.",
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
    { key: "name", label: "Key name", type: "string" },
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
  ],
  output: [{ key: "id", type: "string", label: "ID" }],

  execute(input, ctx) {
    return new PhraseClient(ctx).json(
      `/projects/${encodeId(input.projectId)}/keys/${encodeId(input.keyId)}`,
      {
        method: "PATCH",
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
        },
      },
    );
  },
};

export default keyUpdate;
