import type { ActionDefinition } from "@w6w/types";
import { DropboxSignClient } from "../lib/client.ts";

/**
 * `GET /signature_request/files_as_file_url/{id}` and
 * `…/files_as_data_uri/{id}` — verified against the official OpenAPI document
 * (`signatureRequestFilesAsFileUrl`, `signatureRequestFilesAsDataUri`).
 *
 * **The third variant is deliberately not offered.** `GET
 * /signature_request/files/{id}` streams the PDF itself. An App returns JSON to
 * a workflow, so handing back megabytes of base64 inline — or worse, dropping
 * the bytes — helps nobody. The two variants here both return JSON: a temporary
 * link, or a data URI.
 *
 * The link is **short-lived**. The response carries `expires_at`, and a
 * workflow that stores the URL and fetches it an hour later gets nothing. Fetch
 * it in the same run, or store the id and ask again.
 */
const action: ActionDefinition = {
  key: "signature-request-files-get",
  type: "read",
  resource: "signature-request",
  title: "Get a signature request's files",
  description: "Get a temporary download link, or a data URI, for the signed document.",
  params: [
    {
      key: "signatureRequestId",
      label: "Signature Request ID",
      type: "string",
      required: true,
      default: "",
    },
    {
      key: "format",
      label: "Format",
      type: "select",
      default: "file_url",
      options: [
        { value: "file_url", label: "Temporary URL (expires — see `expires_at`)" },
        { value: "data_uri", label: "Data URI (base64 inline, large)" },
      ],
      hint: "The raw PDF stream is not offered — an App returns JSON, not bytes.",
    },
    {
      key: "forceDownload",
      label: "Force Download",
      type: "boolean",
      default: true,
      hint: "Whether opening the URL downloads the file rather than previewing it.",
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
    const id = String(p.signatureRequestId ?? "").trim();
    if (!id) throw new Error("`signatureRequestId` is required");
    // The host applies `default`, but a bare execute() call does not.
    const format = String(p.format ?? "file_url");

    ctx.log("info", "getting Dropbox Sign files", { id, format });

    const path = format === "data_uri"
      ? `/signature_request/files_as_data_uri/${encodeURIComponent(id)}`
      : `/signature_request/files_as_file_url/${encodeURIComponent(id)}`;

    return await new DropboxSignClient(ctx).request(path, {
      query: format === "file_url" && p.forceDownload === false ? { force_download: 0 } : undefined,
    });
  },
};

export default action;
