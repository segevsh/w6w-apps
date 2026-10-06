import type { ActionDefinition } from "@w6w/types";
import { encodeId, PhraseClient } from "../lib/client.ts";

/**
 * `POST /v2/projects/{projectId}/locales` — add a locale to a project.
 */
interface Input {
  projectId: string;
  name: string;
  code: string;
  branch?: string;
  default?: boolean;
  main?: boolean;
  rtl?: boolean;
  sourceLocaleId?: string;
  fallbackLocaleId?: string;
  autotranslate?: boolean;
}

const localeCreate: ActionDefinition<Input> = {
  key: "locale-create",
  type: "perform",
  resource: "locale",
  title: "Create Locale",
  description: "Add a locale to a project.",
  idempotent: false,
  params: [
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      required: true,
      hint: "Phrase Strings project id (from List Projects, or the project URL).",
    },
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "code",
      label: "Locale code",
      type: "string",
      required: true,
      hint: "e.g. `de`, `pt-BR`.",
    },
    {
      key: "branch",
      label: "Branch",
      type: "string",
      hint: "Branch name, for projects with branching enabled. Leave empty for the main branch.",
    },
    { key: "default", label: "Default locale", type: "boolean" },
    { key: "main", label: "Main locale", type: "boolean" },
    { key: "rtl", label: "Right-to-left", type: "boolean" },
    { key: "sourceLocaleId", label: "Source locale ID", type: "string" },
    { key: "fallbackLocaleId", label: "Fallback locale ID", type: "string" },
    { key: "autotranslate", label: "Autotranslate", type: "boolean" },
  ],
  output: [{ key: "id", type: "string", label: "ID" }],

  execute(input, ctx) {
    return new PhraseClient(ctx).json(`/projects/${encodeId(input.projectId)}/locales`, {
      method: "POST",
      body: {
        name: input.name,
        code: input.code,
        branch: input.branch,
        default: input.default,
        main: input.main,
        rtl: input.rtl,
        source_locale_id: input.sourceLocaleId,
        fallback_locale_id: input.fallbackLocaleId,
        autotranslate: input.autotranslate,
      },
    });
  },
};

export default localeCreate;
