import type { ActionDefinition } from "@w6w/types";
import { type ListEnvelope, SmartSuiteClient } from "../lib/client.ts";

interface Input {
  offset?: number;
  limit?: number;
  sort?: unknown;
  filter?: unknown;
}

/**
 * `POST /members/list/` — the workspace's members (users).
 *
 * Same envelope shape as `list-records` — query-param `offset`/`limit` plus a
 * `{ sort, filter }` body, answering `{ total, offset, limit, items }` — which
 * is what makes member ids resolvable for `add-comment`'s `assignedTo`, and
 * what makes an "assign this to the owner of record X" workflow possible.
 */
const listMembers: ActionDefinition<Input, ListEnvelope> = {
  key: "list-members",
  type: "search",
  resource: "member",
  title: "List Members",
  description: "List the members of the SmartSuite workspace (POST /members/list/).",
  params: [
    {
      key: "offset",
      label: "Offset",
      type: "number",
      validation: { integer: true },
      hint: "Number of members to skip. Pair with `limit` to walk the result set.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 100,
      validation: { integer: true, min: 1, max: 1000 },
      hint: "Maximum members to return (default 100).",
    },
    {
      key: "sort",
      label: "Sort",
      type: "json",
      hint: 'SmartSuite sort array, e.g. [{ "field": "last_name", "direction": "asc" }].',
    },
    {
      key: "filter",
      label: "Filter",
      type: "json",
      hint: "SmartSuite filter tree.",
    },
  ],
  output: [
    { key: "total", type: "number", label: "Total matching members" },
    { key: "offset", type: "number", label: "Offset of this page" },
    { key: "limit", type: "number", label: "Page size" },
    { key: "items", type: "array", label: "Members" },
  ],

  execute(input, ctx) {
    const body: Record<string, unknown> = {};
    if (input.sort !== undefined) body.sort = input.sort;
    if (input.filter !== undefined) body.filter = input.filter;

    return new SmartSuiteClient(ctx).request<ListEnvelope>("members/list/", {
      method: "POST",
      query: { offset: input.offset, limit: input.limit ?? 100 },
      body,
    });
  },
};

export default listMembers;
