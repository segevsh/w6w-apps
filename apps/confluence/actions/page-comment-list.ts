import type { ActionDefinition } from "@w6w/types";
import { ConfluenceClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /wiki/api/v2/pages/{id}/footer-comments` — verified against Confluence
 * Cloud's REST API v2 OpenAPI document (`getPageFooterComments`).
 *
 * Confluence has two kinds of comment and they live at different endpoints:
 * **footer** comments are the discussion thread at the bottom of a page, and
 * **inline** comments are anchored to a text selection. This action reads the
 * footer thread — the one a workflow usually means by "the page's comments".
 * Inline comments need the anchor context to be meaningful, so they are read
 * through their own endpoint rather than silently merged in here.
 */
const action: ActionDefinition = {
  key: "page-comment-list",
  type: "read",
  resource: "comment",
  title: "List a page's comments",
  description: "List the footer comments on one page.",
  params: [
    { key: "pageId", label: "Page ID", type: "string", required: true, default: "" },
    ...LIST_PARAMS,
    {
      key: "bodyFormat",
      label: "Body Format",
      type: "select",
      default: "storage",
      options: [
        { value: "storage", label: "Storage (XHTML)" },
        { value: "atlas_doc_format", label: "Atlassian Document Format" },
        { value: "view", label: "View (rendered HTML)" },
      ],
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const pageId = String(p.pageId ?? "").trim();
    if (!pageId) throw new Error("`pageId` is required");

    const client = new ConfluenceClient(ctx);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Confluence page comments", { pageId, returnAll, limit });

    return await client.requestAll(
      `/pages/${encodeURIComponent(pageId)}/footer-comments`,
      { query: { "body-format": (p.bodyFormat as string) || undefined } },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
