import type { ActionDefinition } from "@w6w/types";
import { ConfluenceClient, csv } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /wiki/api/v2/spaces` — verified against Confluence Cloud's REST API v2
 * OpenAPI document (`getSpaces`).
 *
 * This is where the numeric `spaceId` that every page action wants comes from.
 * v2 addresses spaces by ID, not by the human-facing space key that v1 and the
 * Confluence UI use — `keys` filters by the latter to bridge the two.
 */
const action: ActionDefinition = {
  key: "space-list",
  type: "read",
  resource: "space",
  title: "List spaces",
  description: "List spaces, optionally filtered by key, type or status.",
  params: [
    ...LIST_PARAMS,
    {
      key: "keys",
      label: "Space Keys",
      type: "string",
      default: "",
      hint: "Comma-separated space keys (the short code in the UI, e.g. `ENG`).",
    },
    {
      key: "type",
      label: "Type",
      type: "select",
      default: "",
      options: [
        { value: "global", label: "Global" },
        { value: "personal", label: "Personal" },
      ],
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      default: "",
      options: [
        { value: "current", label: "Current" },
        { value: "archived", label: "Archived" },
      ],
    },
    {
      key: "labels",
      label: "Labels",
      type: "string",
      default: "",
      hint: "Comma-separated label names.",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new ConfluenceClient(ctx);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Confluence spaces", { returnAll, limit });

    return await client.requestAll(
      "/spaces",
      {
        query: {
          keys: csv(p.keys),
          type: (p.type as string) || undefined,
          status: (p.status as string) || undefined,
          labels: csv(p.labels),
        },
      },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
