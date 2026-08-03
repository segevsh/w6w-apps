import type { ActionDefinition } from "@w6w/types";
import { CircleClient } from "../lib/client.ts";
import { acknowledgementOutput, spaceIdParam } from "../lib/params.ts";

/**
 * `DELETE /space_members?email=&space_id=` — remove one member from one space.
 *
 * Note the shape: the add is a **POST with a JSON body**, the remove is a
 * **DELETE with query parameters**. Same two fields, different transport. This
 * is transcribed from the endpoint's parameter table (`email` and `space_id`
 * both `in: query`, both required) rather than assumed by symmetry with the
 * add — sending them as a body here would produce a 404 on a route that never
 * saw them.
 *
 * The removal is scoped to the one space. It does not deactivate the member or
 * touch their other memberships; `member-deactivate` is the community-wide
 * operation.
 *
 * Idempotent: removing an absent membership converges on the same state.
 */
interface Input {
  email: string;
  spaceId: number;
}

const spaceMemberRemove: ActionDefinition<Input> = {
  key: "space-member-remove",
  type: "perform",
  resource: "space-member",
  title: "Remove Member from Space",
  description:
    "Remove one member from one space by email address. Their other spaces and their community " +
    "membership are untouched.",
  idempotent: true,
  params: [
    {
      key: "email",
      label: "Member email",
      type: "string",
      required: true,
      placeholder: "person@example.com",
    },
    spaceIdParam(true),
  ],
  output: acknowledgementOutput,

  execute(input, ctx) {
    return new CircleClient(ctx).request("/space_members", {
      method: "DELETE",
      // Query, not body — this route reads both fields from the query string.
      query: { email: input.email, space_id: input.spaceId },
    });
  },
};

export default spaceMemberRemove;
