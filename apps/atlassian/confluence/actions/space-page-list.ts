import type { ActionDefinition } from "@w6w/types";
import { ConfluenceClient } from "../lib/client.ts";
import { BODY_FORMAT_PARAM, LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /wiki/api/v2/spaces/{id}/pages` — verified against Confluence Cloud's
 * REST API v2 OpenAPI document (`getPagesInSpace`).
 *
 * `page-list` with a space filter answers a similar question, but this
 * endpoint adds `depth`, which is the only way to ask for just the space's
 * root pages rather than every page in it.
 */
const action: ActionDefinition = {
  key: "space-page-list",
  type: "read",
  resource: "page",
  title: "List a space's pages",
  description: "List the pages in one space, optionally only the root-level ones.",
  params: [
    { key: "spaceId", label: "Space ID", type: "string", required: true, default: "" },
    ...LIST_PARAMS,
    {
      key: "depth",
      label: "Depth",
      type: "select",
      default: "",
      options: [
        { value: "all", label: "All pages" },
        { value: "root", label: "Root level only" },
      ],
    },
    { key: "title", label: "Title", type: "string", default: "" },
    BODY_FORMAT_PARAM,
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const spaceId = String(p.spaceId ?? "").trim();
    if (!spaceId) throw new Error("`spaceId` is required");

    const client = new ConfluenceClient(ctx);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Confluence space pages", { spaceId, returnAll, limit });

    return await client.requestAll(
      `/spaces/${encodeURIComponent(spaceId)}/pages`,
      {
        query: {
          depth: (p.depth as string) || undefined,
          title: (p.title as string) || undefined,
          "body-format": (p.bodyFormat as string) || undefined,
        },
      },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
