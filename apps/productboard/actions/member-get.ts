import type { ActionDefinition } from "@w6w/types";
import { type DataResult, encodeId, ProductboardClient } from "../lib/client.ts";

/**
 * `GET /v2/members/{id}` — one workspace member.
 *
 * **This is not a whoami.** API v2 publishes no `/me`, no `/users/me` and no
 * `/account` — all three answer `404 route.notFound`, measured 2026-08-11 — so
 * there is no way to ask "who does this token belong to?", and this endpoint
 * needs an id you already have. That absence is why this App derives no
 * connection label and why its credential probe is a configuration read.
 *
 * As with `member-list`, personal fields come back as the literal
 * `"[redacted]"` when the token lacks `members:pii:read`.
 */
interface Input {
  memberId: string;
}

const memberGet: ActionDefinition<Input, DataResult> = {
  key: "member-get",
  type: "read",
  resource: "member",
  title: "Get member",
  description:
    "Retrieve one workspace member by ID. Not a whoami — API v2 has no endpoint that identifies " +
    "the calling token.",
  params: [
    {
      key: "memberId",
      label: "Member ID",
      type: "string",
      required: true,
      placeholder: "123e4567-e89b-12d3-a456-426614174000",
      hint: "UUID from a List members result, or from an entity's `owner.id`.",
    },
  ],
  output: [{ key: "data", type: "object", label: "Member" }],

  async execute(input, ctx) {
    const data = await new ProductboardClient(ctx).data(`/members/${encodeId(input.memberId)}`);
    return { data };
  },
};

export default memberGet;
