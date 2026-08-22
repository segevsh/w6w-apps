import type { ActionDefinition } from "@w6w/types";
import { ConfluenceClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /wiki/api/v2/pages/{id}/attachments` — verified against Confluence
 * Cloud's REST API v2 OpenAPI document (`getPageAttachments`).
 */
const action: ActionDefinition = {
  key: "page-attachment-list",
  type: "read",
  resource: "attachment",
  title: "List a page's attachments",
  description: "List the files attached to one page.",
  params: [
    { key: "pageId", label: "Page ID", type: "string", required: true, default: "" },
    ...LIST_PARAMS,
    {
      key: "mediaType",
      label: "Media Type",
      type: "string",
      default: "",
      placeholder: "image/png",
      hint: "Confluence accepts only one.",
    },
    { key: "filename", label: "Filename", type: "string", default: "" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const pageId = String(p.pageId ?? "").trim();
    if (!pageId) throw new Error("`pageId` is required");

    const client = new ConfluenceClient(ctx);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Confluence page attachments", { pageId, returnAll, limit });

    return await client.requestAll(
      `/pages/${encodeURIComponent(pageId)}/attachments`,
      {
        query: {
          mediaType: (p.mediaType as string) || undefined,
          filename: (p.filename as string) || undefined,
        },
      },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
