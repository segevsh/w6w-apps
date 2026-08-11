import type { ActionDefinition } from "@w6w/types";
import { type ListResult, ProductboardClient, toList } from "../lib/client.ts";
import { listOutput, memberRoleOptions, pageCursorParam } from "../lib/params.ts";

/**
 * `GET /v2/members` — who is in this workspace.
 *
 * A v2-only capability: v1 had no members endpoint at all.
 *
 * Three separate `include*` flags, all defaulting to `false`, and they are not
 * one axis: `includeDisabled`, `includeInvitationPending` and `includeInvited`
 * are independent, so the default answer is "active, accepted members only".
 * A workflow reconciling a seat list needs all three on, or it will conclude
 * that half the org does not exist.
 *
 * **Personal data.** This response is member email addresses. Where the token
 * lacks the `members:pii:read` scope, Productboard substitutes the literal
 * string `"[redacted]"` (its `ObfuscatedValue` schema is an enum of exactly that
 * value) rather than omitting the field — so a downstream step must treat
 * `"[redacted]"` as absent, not as an address. This is also precisely why the
 * health probe is `/entities/configurations` and not this endpoint.
 */
interface Input {
  query?: string;
  roles?: string[] | string;
  includeDisabled?: boolean;
  includeInvitationPending?: boolean;
  includeInvited?: boolean;
  pageCursor?: string;
}

const memberList: ActionDefinition<Input, ListResult> = {
  key: "member-list",
  type: "search",
  resource: "member",
  title: "List members",
  description: "List workspace members, optionally filtered by role or a search term. Disabled, " +
    "invitation-pending and invited members are excluded unless asked for.",
  params: [
    {
      key: "query",
      label: "Search term",
      type: "string",
      validation: { minLength: 1, maxLength: 255 },
      hint: "Matches name or email.",
    },
    {
      key: "roles",
      label: "Roles",
      type: "multiselect",
      options: memberRoleOptions,
      hint: "Sent as repeated `roles[]` values.",
    },
    {
      key: "includeDisabled",
      label: "Include disabled",
      type: "boolean",
      hint: "Off by default, matching the API.",
    },
    {
      key: "includeInvitationPending",
      label: "Include invitation pending",
      type: "boolean",
      hint: "Off by default. Independent of the other two flags.",
    },
    {
      key: "includeInvited",
      label: "Include invited",
      type: "boolean",
      hint: "Off by default. Independent of the other two flags.",
    },
    pageCursorParam,
  ],
  output: listOutput,

  execute(input, ctx) {
    return new ProductboardClient(ctx).list("/members", {
      query: {
        query: input.query,
        "roles[]": toList(input.roles),
        includeDisabled: input.includeDisabled,
        includeInvitationPending: input.includeInvitationPending,
        includeInvited: input.includeInvited,
        pageCursor: input.pageCursor,
      },
    });
  },
};

export default memberList;
