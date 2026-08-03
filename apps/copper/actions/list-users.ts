import type { ActionDefinition } from "@w6w/types";
import {
  CopperClient,
  SEARCH_OUTPUT,
  searchBody,
  type SearchInput,
  type SearchResult,
} from "../lib/client.ts";

type Input = Pick<SearchInput, "pageNumber" | "pageSize">;

/**
 * `POST /users/search` — the Users on the account.
 *
 * Titled "List Users" by Copper and shaped like a search: a POST with a JSON
 * body, same as every other collection. It takes **only** `page_number` and
 * `page_size` — Copper's parameter table for this endpoint lists no filters and
 * no sorting at all, so no `sortBy` / `sortDirection` params are offered here
 * even though every other search action has them. Offering them would be
 * inventing surface.
 *
 * This is the lookup behind every `assigneeId` param in this app: a Copper User
 * is `{id, name, email, groups}`, and the id is what assignment fields take.
 * `-2` is the sentinel for "no assignee" in search filters — it is not a real
 * user and will not appear here.
 */
const listUsers: ActionDefinition<Input> = {
  key: "list-users",
  type: "search",
  resource: "user",
  title: "List Users",
  description: "List the Users on the Copper account — the ids every assignee field takes. `POST " +
    "/users/search`, which accepts paging only: Copper documents no filters or sorting for it.",
  params: [
    {
      key: "pageNumber",
      label: "Page number",
      type: "number",
      hint: "1-based page to request (`page_number`). Copper defaults to 1.",
    },
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      hint: "Records per page (`page_size`). Copper defaults to 20 and caps it at 200.",
      validation: { min: 1, max: 200, integer: true },
    },
  ],
  output: SEARCH_OUTPUT,

  execute(input, ctx): Promise<SearchResult> {
    return new CopperClient(ctx).search("/users/search", searchBody(input));
  },
};

export default listUsers;
