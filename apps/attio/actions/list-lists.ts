import type { ActionDefinition } from "@w6w/types";
import { AttioClient, PAGE_OUTPUT } from "../lib/client.ts";

/**
 * `GET /v2/lists` — every list the token can see.
 *
 * "List all lists that your access token has access to. lists are returned in
 * the order that they are sorted in the sidebar."
 *
 * Two things follow from that one sentence, and both matter:
 *
 *  1. **The result is scoped to the token, not to the workspace.** A list whose
 *     access configuration excludes this token simply is not here. An empty or
 *     short result is a permissions answer as often as it is a data answer —
 *     compare `public_collection:read` against `private_collection:read` on the
 *     Connection's granted scopes.
 *  2. **The order is the sidebar order**, which is a human arrangement, not a
 *     stable sort key. Do not page on the assumption it is deterministic across
 *     time.
 *
 * This is the lookup that feeds every entry action: `api_slug` and the list's
 * UUID both appear here, and either is accepted wherever a list is named. There
 * are no query parameters — the endpoint takes none.
 */
const listLists: ActionDefinition<Record<string, never>> = {
  key: "list-lists",
  type: "read",
  resource: "list",
  title: "List Lists",
  description:
    "Every list this access token can see, in sidebar order. Gives you the `api_slug` and UUID " +
    "the entry actions need. A list missing here is usually a scope problem, not an empty " +
    "workspace.",
  params: [],
  output: PAGE_OUTPUT,

  async execute(_input, ctx) {
    const { records } = await new AttioClient(ctx).list("/lists");
    return { records };
  },
};

export default listLists;
