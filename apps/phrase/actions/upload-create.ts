import type { ActionDefinition } from "@w6w/types";
import { compact, csv, encodeId, PhraseClient } from "../lib/client.ts";

/**
 * `POST /v2/projects/{projectId}/uploads` — import a locale file (JSON, YAML, strings, XLIFF, …) into a project. Processing is asynchronous: poll Get Upload until `state` is `success` or `failed`.
 */
interface Input {
  projectId: string;
  file: string;
  fileName?: string;
  fileFormat: string;
  localeId: string;
  branch?: string;
  tags?: string[] | string;
  updateTranslations?: boolean;
  updateTranslationKeys?: boolean;
  updateDescriptions?: boolean;
  skipUploadTags?: boolean;
  skipUnverification?: boolean;
  autotranslate?: boolean;
  markReviewed?: boolean;
}

const uploadCreate: ActionDefinition<Input> = {
  key: "upload-create",
  type: "perform",
  resource: "upload",
  title: "Upload File",
  description:
    "Import a locale file (JSON, YAML, strings, XLIFF, \u2026) into a project. Processing is asynchronous: poll Get Upload until `state` is `success` or `failed`.",
  idempotent: false,
  params: [
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      required: true,
      hint: "Phrase Strings project id (from List Projects, or the project URL).",
    },
    {
      key: "file",
      label: "File content",
      type: "text",
      required: true,
      hint: "The file's text content. Binary formats are not supported by this action.",
    },
    {
      key: "fileName",
      label: "File name",
      type: "string",
      hint: "Defaults to `upload.<format>`. Some formats are detected from the extension.",
    },
    {
      key: "fileFormat",
      label: "File format",
      type: "string",
      required: true,
      hint:
        "A format `api_name`, e.g. `nested_json`. Phrase can auto-detect when omitted, but not reliably for JSON, so it is required here.",
    },
    {
      key: "localeId",
      label: "Locale ID or name",
      type: "string",
      required: true,
      hint: "The locale the file's content is in. An id is preferred.",
    },
    {
      key: "branch",
      label: "Branch",
      type: "string",
      hint: "Branch name, for projects with branching enabled. Leave empty for the main branch.",
    },
    { key: "tags", label: "Tags", type: "string", hint: "Comma-separated tags for new keys." },
    { key: "updateTranslations", label: "Update existing translations", type: "boolean" },
    {
      key: "updateTranslationKeys",
      label: "Update / create keys",
      type: "boolean",
      hint: "Pass false to keep the upload from creating or updating keys.",
    },
    { key: "updateDescriptions", label: "Update key descriptions", type: "boolean" },
    { key: "skipUploadTags", label: "Skip upload tags", type: "boolean" },
    { key: "skipUnverification", label: "Skip unverification", type: "boolean" },
    { key: "autotranslate", label: "Autotranslate", type: "boolean" },
    { key: "markReviewed", label: "Mark reviewed", type: "boolean" },
  ],
  output: [{ key: "id", type: "string", label: "ID" }],

  execute(input, ctx) {
    const form = new FormData();
    const name = input.fileName?.trim() || `upload.${input.fileFormat}`;
    form.append("file", new Blob([input.file], { type: "text/plain" }), name);
    for (
      const [k, v] of Object.entries(compact({
        file_format: input.fileFormat,
        locale_id: input.localeId,
        branch: input.branch,
        tags: csv(input.tags),
        update_translations: input.updateTranslations,
        update_translation_keys: input.updateTranslationKeys,
        update_descriptions: input.updateDescriptions,
        skip_upload_tags: input.skipUploadTags,
        skip_unverification: input.skipUnverification,
        autotranslate: input.autotranslate,
        mark_reviewed: input.markReviewed,
      }))
    ) {
      form.append(k, String(v));
    }
    return new PhraseClient(ctx).json(`/projects/${encodeId(input.projectId)}/uploads`, {
      method: "POST",
      form,
    });
  },
};

export default uploadCreate;
