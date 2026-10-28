import type { ActionDefinition } from "@w6w/types";
import { ConfluenceClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /wiki/api/v2/pages/{id}/labels` — verified against Confluence Cloud's
 * REST API v2 OpenAPI document (`getPageLabels`).
 *
 * Read-only: v2 publishes no label-write endpoint for pages (adding a label is
 * still a v1 call), so this app reads them and does not pretend otherwise.
 */
const action: ActionDefinition = {
  key: "page-label-list",
  type: "read",
  resource: "label",
  title: "List a page's labels",
  description: "List the labels on one page.",
  params: [
    { key: "pageId", label: "Page ID", type: "string", required: true, default: "" },
    ...LIST_PARAMS,
    {
      key: "prefix",
      label: "Prefix",
      type: "select",
      default: "",
      options: [
        { value: "my", label: "my" },
        { value: "team", label: "team" },
        { value: "global", label: "global" },
        { value: "system", label: "system" },
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

    ctx.log("info", "listing Confluence page labels", { pageId, returnAll, limit });

    return await client.requestAll(
      `/pages/${encodeURIComponent(pageId)}/labels`,
      { query: { prefix: (p.prefix as string) || undefined } },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
