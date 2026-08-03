import type { ActionDefinition } from "@w6w/types";
import { CircleClient } from "../lib/client.ts";
import { acknowledgementOutput, spaceIdParam } from "../lib/params.ts";

/**
 * `POST /space_members` — put one member in one space.
 *
 * ## It is keyed by EMAIL, not by member id
 *
 * The body is `{ email, space_id }` and both are required. That is a genuine
 * inconsistency in Circle's API — the member routes are keyed by numeric id,
 * the membership routes by address — and it is worth calling out rather than
 * papering over, because an author who has a member id in hand from
 * `member-list` cannot use it here. `member-get` returns the address.
 *
 * ## Additive, unlike the member update
 *
 * This adds a membership and leaves the member's other spaces alone.
 * `member-update`'s `space_ids` **replaces** the whole list. They are different
 * endpoints because they mean different things; use this one whenever the
 * intent is "also put them in this space".
 *
 * For the bulk case — one member into several spaces at once — `member-invite`
 * and `member-update` both take a `space_ids` array in a single request, which
 * Circle explicitly recommends over looping this endpoint. On a 5,000-request
 * monthly allowance the difference is measurable.
 *
 * Idempotent: adding a member who is already in the space converges on the same
 * membership rather than creating a second one.
 */
interface Input {
  email: string;
  spaceId: number;
}

const spaceMemberAdd: ActionDefinition<Input> = {
  key: "space-member-add",
  type: "perform",
  resource: "space-member",
  title: "Add Member to Space",
  description:
    "Add one member to one space by email address. Additive — their other spaces are untouched.",
  idempotent: true,
  params: [
    {
      key: "email",
      label: "Member email",
      type: "string",
      required: true,
      placeholder: "person@example.com",
      hint: "This endpoint is keyed by address, not by member id — unlike the member routes.",
    },
    spaceIdParam(true),
  ],
  output: acknowledgementOutput,

  execute(input, ctx) {
    return new CircleClient(ctx).request("/space_members", {
      method: "POST",
      body: { email: input.email, space_id: input.spaceId },
    });
  },
};

export default spaceMemberAdd;
