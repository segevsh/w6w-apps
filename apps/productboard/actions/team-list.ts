import type { ActionDefinition } from "@w6w/types";
import { type ListResult, ProductboardClient } from "../lib/client.ts";
import { listOutput, pageCursorParam } from "../lib/params.ts";

/**
 * `GET /v2/teams` — the workspace's teams.
 *
 * Another v2-only surface; v1 had no teams endpoint. A team has both a `name`
 * and a `handle`, and they are separate filters here — `handle` is the stable
 * one, since a team can be renamed.
 *
 * `query` is the fuzzy alternative to the two exact filters, not an addition to
 * them.
 */
interface Input {
  name?: string;
  handle?: string;
  query?: string;
  pageCursor?: string;
}

const teamList: ActionDefinition<Input, ListResult> = {
  key: "team-list",
  type: "search",
  resource: "team",
  title: "List teams",
  description: "List the workspace's teams, optionally filtered by name, handle or a search term.",
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      validation: { minLength: 1, maxLength: 255 },
    },
    {
      key: "handle",
      label: "Handle",
      type: "string",
      validation: { minLength: 1, maxLength: 255 },
      hint: "The stable identifier — a team's name can change, its handle usually does not.",
    },
    {
      key: "query",
      label: "Search term",
      type: "string",
      validation: { minLength: 1, maxLength: 255 },
      hint: "Fuzzy alternative to the two exact filters above.",
    },
    pageCursorParam,
  ],
  output: listOutput,

  execute(input, ctx) {
    return new ProductboardClient(ctx).list("/teams", {
      query: {
        name: input.name,
        handle: input.handle,
        query: input.query,
        pageCursor: input.pageCursor,
      },
    });
  },
};

export default teamList;
