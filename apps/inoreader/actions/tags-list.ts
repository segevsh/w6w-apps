import type { ActionDefinition } from "@w6w/types";
import { InoreaderClient } from "../lib/client.ts";

/**
 * `GET /reader/api/0/tag/list` (zone 1) — folders and tags. Parameters: `types=1` adds each
 * item's `type` (`tag`, `folder`, `active_search`); `counts=1` (only together with `types=1`)
 * adds `unread_count` / `unseen_count`; `team_assets=1` adds team folders and tags.
 */
interface Input {
  includeTypes?: boolean;
  includeCounts?: boolean;
  teamAssets?: boolean;
}

const tagsList: ActionDefinition<Input> = {
  key: "tags-list",
  type: "read",
  resource: "tags",
  title: "List Folders and Tags",
  description: "List the user's folders, tags and active searches, optionally with unread counts.",
  params: [
    {
      key: "includeTypes",
      label: "Include item type",
      type: "boolean",
      default: true,
      hint: "Adds `type`: tag, folder or active_search.",
    },
    {
      key: "includeCounts",
      label: "Include unread counts",
      type: "boolean",
      default: false,
      hint: "Adds unread_count / unseen_count. Forces item type on, as Inoreader requires.",
    },
    { key: "teamAssets", label: "Include team assets", type: "boolean", default: false },
  ],
  output: [
    { key: "tags", type: "array", label: "Folders and tags" },
    { key: "count", type: "number", label: "Number of items" },
  ],

  async execute(input, ctx) {
    const counts = input.includeCounts === true;
    const types = counts || input.includeTypes !== false;
    const body = await new InoreaderClient(ctx).json<{ tags?: unknown[] }>("/tag/list", {
      query: {
        types: types ? 1 : undefined,
        counts: counts ? 1 : undefined,
        team_assets: input.teamAssets ? 1 : undefined,
      },
    });
    const tags = body.tags ?? [];
    return { tags, count: tags.length };
  },
};

export default tagsList;
