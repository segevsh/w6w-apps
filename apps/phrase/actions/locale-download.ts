import type { ActionDefinition } from "@w6w/types";
import { csv, encodeId, PhraseClient } from "../lib/client.ts";

/**
 * `GET /v2/projects/{projectId}/locales/{localeId}/download` — download one locale as a file in a chosen format (JSON, YAML, strings, XLIFF, …). Returns the file text.
 */
interface Input {
  projectId: string;
  localeId: string;
  fileFormat: string;
  branch?: string;
  tags?: string[] | string;
  includeEmptyTranslations?: boolean;
  includeUnverifiedTranslations?: boolean;
  fallbackLocaleId?: string;
  useLocaleFallback?: boolean;
  updatedSince?: string;
  encoding?: string;
}

const localeDownload: ActionDefinition<Input> = {
  key: "locale-download",
  type: "read",
  resource: "locale",
  title: "Download Locale",
  description:
    "Download one locale as a file in a chosen format (JSON, YAML, strings, XLIFF, \u2026). Returns the file text.",
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
      key: "fileFormat",
      label: "File format",
      type: "string",
      required: true,
      hint: "A format `api_name`, e.g. `nested_json`. See List Formats.",
    },
    {
      key: "branch",
      label: "Branch",
      type: "string",
      hint: "Branch name, for projects with branching enabled. Leave empty for the main branch.",
    },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      hint: "Only keys with these tags (comma-separated).",
    },
    { key: "includeEmptyTranslations", label: "Include empty translations", type: "boolean" },
    {
      key: "includeUnverifiedTranslations",
      label: "Include unverified translations",
      type: "boolean",
    },
    { key: "fallbackLocaleId", label: "Fallback locale ID", type: "string" },
    { key: "useLocaleFallback", label: "Use locale fallback", type: "boolean" },
    {
      key: "updatedSince",
      label: "Updated since",
      type: "datetime",
      hint: "Only keys and translations changed since this ISO 8601 time.",
    },
    {
      key: "encoding",
      label: "Encoding",
      type: "select",
      options: [
        { value: "UTF-8", label: "UTF-8" },
        { value: "UTF-16", label: "UTF-16" },
        { value: "UTF-16BE", label: "UTF-16BE" },
        { value: "UTF-16LE", label: "UTF-16LE" },
        { value: "ISO-8859-1", label: "ISO-8859-1" },
      ],
    },
  ],
  output: [
    { key: "content", type: "string", label: "File content" },
    { key: "contentType", type: "string", label: "Content-Type of the file" },
    { key: "etag", type: "string", label: "ETag, for conditional re-downloads" },
  ],

  execute(input, ctx) {
    return new PhraseClient(ctx).text(
      `/projects/${encodeId(input.projectId)}/locales/${encodeId(input.localeId)}/download`,
      {
        query: {
          file_format: input.fileFormat,
          branch: input.branch,
          tags: csv(input.tags),
          include_empty_translations: input.includeEmptyTranslations,
          include_unverified_translations: input.includeUnverifiedTranslations,
          fallback_locale_id: input.fallbackLocaleId,
          use_locale_fallback: input.useLocaleFallback,
          updated_since: input.updatedSince,
          encoding: input.encoding,
        },
      },
    );
  },
};

export default localeDownload;
