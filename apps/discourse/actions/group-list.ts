import type { ActionDefinition } from "@w6w/types";
import { DiscourseClient } from "../lib/client.ts";
import { groupOutput } from "../lib/params.ts";

/**
 * `GET /groups.json` — every group the credential can see.
 *
 * The reference documents no parameters at all for this route: no filter, no
 * ordering, no page size. So none are offered. Discourse does return
 * `total_rows_groups` / `load_more_groups` in the envelope, which is how a
 * caller pages, but the query parameter that drives it is not published and is
 * therefore not guessed at here.
 *
 * The response envelopes under `groups`, alongside `extras.type_filters`. It is
 * returned whole so both survive.
 */
type Input = Record<string, never>;

const groupList: ActionDefinition<Input> = {
  key: "group-list",
  type: "search",
  resource: "group",
  title: "List Groups",
  description: "Every group visible to the connection.",
  params: [],
  output: [
    { key: "groups", type: "array", label: "Groups" },
    ...groupOutput.map((f) => ({ ...f, key: `groups[].${f.key}` })),
    { key: "total_rows_groups", type: "number", label: "Total groups" },
    { key: "load_more_groups", type: "string", label: "Next page URL" },
  ],

  execute(_input, ctx) {
    return new DiscourseClient(ctx).request("/groups.json");
  },
};

export default groupList;
