import type { ActionDefinition } from "@w6w/types";
import { csv, DeelClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /people` — verified against Deel's own OpenAPI document
 * (`hris-endpoints.json`, `get-people`).
 *
 * **Offset**-paginated (`{data, page: {offset, total_rows, items_per_page}}`),
 * unlike the contract collections, which use a cursor. Sending `after_cursor`
 * here is silently ignored and returns page one forever, which is why the
 * client keeps two pagers.
 */
const action: ActionDefinition = {
  key: "person-list",
  type: "read",
  resource: "person",
  title: "List people",
  description: "List the workers in this organization.",
  params: [
    ...LIST_PARAMS,
    { key: "search", label: "Search", type: "string", default: "", hint: "Match on name." },
    {
      key: "teams",
      label: "Team IDs",
      type: "string",
      default: "",
      hint: "Comma-separated.",
    },
    {
      key: "hiringStatuses",
      label: "Hiring Statuses",
      type: "string",
      default: "",
      placeholder: "active,onboarding",
      hint: "Comma-separated.",
    },
    {
      key: "fields",
      label: "Fields",
      type: "string",
      default: "",
      hint: "Comma-separated. Restrict the payload to the fields you need.",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    const query = {
      search: (p.search as string) || undefined,
      teams: csv(p.teams),
      hiring_statuses: csv(p.hiringStatuses),
      fields: csv(p.fields),
    };

    ctx.log("info", "listing Deel people", { returnAll, limit });

    return await new DeelClient(ctx).requestAllOffset(
      "/people",
      { query },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
