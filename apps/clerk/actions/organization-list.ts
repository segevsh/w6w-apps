import type { ActionDefinition } from "@w6w/types";
import { ClerkClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /organizations` — answers `{ data: [...], total_count }`, unlike `user-list`'s bare array.
 * See [`lib/client.ts`](../lib/client.ts) for why that distinction has to be handled per endpoint.
 */
const action: ActionDefinition = {
  key: "organization-list",
  type: "read",
  resource: "organization",
  title: "List organizations",
  description: "List organizations on this instance.",
  params: [
    {
      key: "query",
      label: "Search query",
      type: "string",
      default: "",
      hint: "Matches ID " +
        "exactly; matches name or slug partially.",
    },
    { key: "includeMembersCount", label: "Include member counts", type: "boolean", default: false },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "data", type: "array", label: "Organizations" },
    { key: "totalCount", type: "number", label: "Total matching" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const { data, total_count } = await new ClerkClient(ctx).requestEnvelope("/organizations", {
      query: {
        query: p.query as string | undefined,
        include_members_count: p.includeMembersCount === true ? true : undefined,
        limit: (p.limit as number | undefined) ?? 10,
        offset: (p.offset as number | undefined) ?? 0,
      },
    });
    return { data, totalCount: total_count };
  },
};
export default action;
