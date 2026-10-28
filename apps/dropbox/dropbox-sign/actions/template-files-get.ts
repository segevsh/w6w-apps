import type { ActionDefinition } from "@w6w/types";
import { DropboxSignClient } from "../lib/client.ts";

/**
 * `GET /template/files_as_file_url/{template_id}` and
 * `…/files_as_data_uri/{template_id}` — verified against the official OpenAPI
 * document (`templateFilesAsFileUrl`, `templateFilesAsDataUri`).
 *
 * Same reasoning as the signature request equivalent: the raw byte-streaming
 * variant is not offered, and the returned link expires.
 */
const action: ActionDefinition = {
  key: "template-files-get",
  type: "read",
  resource: "template",
  title: "Get a template's files",
  description: "Get a temporary download link, or a data URI, for a template's documents.",
  params: [
    { key: "templateId", label: "Template ID", type: "string", required: true, default: "" },
    {
      key: "format",
      label: "Format",
      type: "select",
      default: "file_url",
      options: [
        { value: "file_url", label: "Temporary URL (expires — see `expires_at`)" },
        { value: "data_uri", label: "Data URI (base64 inline, large)" },
      ],
    },
    {
      key: "forceDownload",
      label: "Force Download",
      type: "boolean",
      default: true,
      showIf: { "==": [{ var: "format" }, "file_url"] },
    },
  ],
  output: [
    { key: "file_url", type: "string", label: "Temporary download URL" },
    { key: "data_uri", type: "string", label: "Base64 data URI" },
    { key: "expires_at", type: "number", label: "When the URL stops working (Unix time)" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.templateId ?? "").trim();
    if (!id) throw new Error("`templateId` is required");
    const format = String(p.format ?? "file_url");

    ctx.log("info", "getting Dropbox Sign template files", { id, format });

    const path = format === "data_uri"
      ? `/template/files_as_data_uri/${encodeURIComponent(id)}`
      : `/template/files_as_file_url/${encodeURIComponent(id)}`;

    return await new DropboxSignClient(ctx).request(path, {
      query: format === "file_url" && p.forceDownload === false ? { force_download: 0 } : undefined,
    });
  },
};

export default action;
