import type { ActionDefinition } from "@w6w/types";
import { MemberstackClient } from "../lib/client.ts";

/**
 * `GET /members/:id_or_email` — by member id (`mem_…`) or URL-encoded email.
 *
 * A member that does not exist is NOT an error: the API answers `200` with `"data": null`,
 * which this action reports as `found: false`.
 */
interface Input {
  idOrEmail: string;
  includeTeams?: boolean;
}

const memberGet: ActionDefinition<Input> = {
  key: "member-get",
  type: "read",
  resource: "member",
  title: "Get Member",
  description: "Fetch one member by id or email. A missing member returns found: false.",
  params: [
    {
      key: "idOrEmail",
      label: "Member ID or email",
      type: "string",
      required: true,
      placeholder: "mem_abc123 or user@example.com",
    },
    {
      key: "includeTeams",
      label: "Include teams",
      type: "boolean",
      default: false,
      hint: "Embed the member's team memberships (include=teams).",
    },
  ],
  output: [
    { key: "found", type: "boolean", label: "Member exists" },
    { key: "member", type: "object", label: "Member (null when not found)" },
  ],

  async execute(input, ctx) {
    const body = await new MemberstackClient(ctx).json<{ data?: unknown | null }>(
      `/members/${encodeURIComponent(input.idOrEmail)}`,
      { query: { include: input.includeTeams ? "teams" : undefined } },
    );
    const member = body?.data ?? null;
    return { found: member !== null, member };
  },
};

export default memberGet;
