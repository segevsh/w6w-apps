import type { ActionDefinition } from "@w6w/types";
import { MiroClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /v2/boards` — verified against Miro's OpenAPI document (`get-boards`).
 *
 * This is an **offset**-paginated collection (`{ data, total, size, offset,
 * limit }`), unlike the board-item collections, which use a cursor. The two
 * contracts are not interchangeable, so the client keeps them apart.
 */
const action: ActionDefinition = {
  key: "board-list",
  type: "read",
  resource: "board",
  title: "List boards",
  description: "List boards this connection can see, optionally filtered by team or name.",
  params: [
    ...LIST_PARAMS,
    { key: "query", label: "Search", type: "string", default: "", hint: "Match on board name." },
    { key: "teamId", label: "Team ID", type: "string", default: "" },
    { key: "projectId", label: "Project ID", type: "string", default: "" },
    {
      key: "owner",
      label: "Owner ID",
      type: "string",
      default: "",
      hint: "Only boards owned by this user.",
    },
    {
      key: "sort",
      label: "Sort By",
      type: "select",
      default: "",
      options: [
        { value: "default", label: "Default" },
        { value: "last_created", label: "Last created" },
        { value: "last_modified", label: "Last modified" },
        { value: "last_opened", label: "Last opened" },
        { value: "alphabetically", label: "Alphabetically" },
      ],
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Miro boards", { returnAll, limit });

    return await new MiroClient(ctx).requestAllOffset(
      "/v2/boards",
      {
        query: {
          query: (p.query as string) || undefined,
          team_id: (p.teamId as string) || undefined,
          project_id: (p.projectId as string) || undefined,
          owner: (p.owner as string) || undefined,
          sort: (p.sort as string) || undefined,
        },
      },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
