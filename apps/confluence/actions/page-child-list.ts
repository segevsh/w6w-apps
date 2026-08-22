import type { ActionDefinition } from "@w6w/types";
import { ConfluenceClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /wiki/api/v2/pages/{id}/children` — verified against Confluence Cloud's
 * REST API v2 OpenAPI document (`getChildPages`).
 */
const action: ActionDefinition = {
  key: "page-child-list",
  type: "read",
  resource: "page",
  title: "List a page's children",
  description: "List the pages directly beneath one page.",
  params: [
    { key: "pageId", label: "Page ID", type: "string", required: true, default: "" },
    ...LIST_PARAMS,
    {
      key: "sort",
      label: "Sort By",
      type: "string",
      default: "",
      placeholder: "child-position",
      hint: "A sort field name; prefix with `-` to reverse. Confluence's schema names no " +
        "enum for this endpoint, so it is left as free text rather than guessing one.",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const pageId = String(p.pageId ?? "").trim();
    if (!pageId) throw new Error("`pageId` is required");

    const client = new ConfluenceClient(ctx);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Confluence child pages", { pageId, returnAll, limit });

    return await client.requestAll(
      `/pages/${encodeURIComponent(pageId)}/children`,
      { query: { sort: (p.sort as string) || undefined } },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
