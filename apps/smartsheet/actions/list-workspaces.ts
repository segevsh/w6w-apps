import type { ActionDefinition } from "@w6w/types";
import { type PaginatedChildren, SmartsheetClient } from "../lib/client.ts";

interface Input {
  maxItems?: number;
  lastKey?: string;
}

/**
 * `GET /workspaces` — workspaces the user can access.
 *
 * ## This endpoint does NOT use page/pageSize
 *
 * Almost every collection in this API is page-numbered, and this one is the
 * exception: it is **token-paged**. The operation declares `maxItems` (integer,
 * default 100, minimum 100, maximum 1000) and `lastKey`, and the response is
 * `{ data, lastKey }` — no `totalCount`, no `pageNumber`. Feed the `lastKey`
 * from one response into the next request to walk the list; its absence means
 * the end.
 *
 * The minimum of 100 is real — asking for `maxItems=10` is out of range, not a
 * smaller page. The response is metadata only: "It returns metadata for the
 * workspaces only and doesn't include nested sub-structures." Use List Container
 * Children for what is inside one.
 */
const listWorkspaces: ActionDefinition<Input, PaginatedChildren> = {
  key: "list-workspaces",
  type: "read",
  resource: "workspace",
  title: "List Workspaces",
  description:
    "List workspaces the connected user can access. Token-paged via `lastKey` rather than " +
    "page/pageSize, and metadata only — use List Container Children for the contents.",
  params: [
    {
      key: "maxItems",
      label: "Max items",
      type: "number",
      validation: { min: 100, max: 1000, integer: true },
      hint: "100 to 1000. Both the default and the MINIMUM are 100 — smaller values are invalid.",
    },
    {
      key: "lastKey",
      label: "Last key",
      type: "string",
      hint: "The `lastKey` from the previous response. Omit for the first page.",
    },
  ],
  output: [
    { key: "data", type: "array", label: "Workspaces" },
    { key: "lastKey", type: "string", label: "Token for the next page; absent at the end" },
  ],

  execute(input, ctx) {
    return new SmartsheetClient(ctx).request<PaginatedChildren>("/workspaces", {
      query: { maxItems: input.maxItems, lastKey: input.lastKey },
    });
  },
};

export default listWorkspaces;
