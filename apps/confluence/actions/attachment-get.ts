import type { ActionDefinition } from "@w6w/types";
import { ConfluenceClient } from "../lib/client.ts";

/**
 * `GET /wiki/api/v2/attachments/{id}` — verified against Confluence Cloud's
 * REST API v2 OpenAPI document (`getAttachmentById`).
 *
 * This returns the attachment's **metadata**, including a `downloadLink`. It
 * does not fetch the file itself: that is a separate, unauthenticated-shaped
 * download URL, and streaming binary through an action's JSON result would be
 * the wrong shape for it.
 */
const action: ActionDefinition = {
  key: "attachment-get",
  type: "read",
  resource: "attachment",
  title: "Get an attachment",
  description: "Retrieve one attachment's metadata, including its download link.",
  params: [
    { key: "attachmentId", label: "Attachment ID", type: "string", required: true, default: "" },
    {
      key: "version",
      label: "Version",
      type: "number",
      default: null,
      hint: "Retrieve an earlier version instead of the current one.",
    },
    { key: "includeLabels", label: "Include Labels", type: "boolean", default: false },
  ],
  output: [
    { key: "id", type: "string", label: "Attachment ID" },
    { key: "title", type: "string", label: "Filename" },
    { key: "mediaType", type: "string", label: "Media type" },
    { key: "fileSize", type: "number", label: "Size (bytes)" },
    { key: "status", type: "string", label: "Status" },
    { key: "pageId", type: "string", label: "Page ID" },
    { key: "downloadLink", type: "string", label: "Download link" },
    { key: "version", type: "object", label: "Version" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const attachmentId = String(p.attachmentId ?? "").trim();
    if (!attachmentId) throw new Error("`attachmentId` is required");

    const client = new ConfluenceClient(ctx);
    ctx.log("info", "getting Confluence attachment", { attachmentId });

    return await client.request(`/attachments/${encodeURIComponent(attachmentId)}`, {
      query: {
        version: typeof p.version === "number" ? p.version : undefined,
        "include-labels": p.includeLabels === true ? "true" : undefined,
      },
    });
  },
};

export default action;
