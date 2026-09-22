/**
 * `GET /api/v2/staff` — the people with an account on this business.
 *
 * Staff are the logins. An instructor profile (`instructors-list`) may or may
 * not be linked to one — `instructors-get`'s `staff` id is the link — and a
 * staff member with no instructor profile does not teach. This is the list a
 * workflow resolves ownership and responsibility against.
 *
 * `has_any_permissions` takes a comma-separated list and returns the staff
 * holding **any** of them, which is the difference between "who can sell a
 * membership" and "who can only see the schedule". The permission names are the
 * business's own TeamUp configuration; the reference does not enumerate them,
 * so they are passed through exactly as given.
 */
import type { ActionDefinition } from "@w6w/types";
import { TeamUpClient } from "../lib/client.ts";
import { commonQuery, type ListInput, listParams, paginationQuery } from "../lib/params.ts";
import { pageOutput } from "../lib/outputs.ts";

interface Input extends ListInput {
  has_any_permissions?: string;
}

const action: ActionDefinition<Input> = {
  key: "staff-list",
  type: "search",
  resource: "staff",
  title: "List Staff",
  description:
    "List the people with an account on this business, optionally filtered by the permissions they " +
    "hold (GET /api/v2/staff).",
  params: [
    {
      key: "has_any_permissions",
      label: "Has any permission",
      type: "string",
      hint: "Comma-separated permission names. Returns staff holding any of them.",
    },
    ...listParams(),
  ],
  output: pageOutput,

  execute(input, ctx) {
    return new TeamUpClient(ctx).request("/staff", {
      query: {
        ...paginationQuery(input),
        has_any_permissions: input.has_any_permissions,
        ...commonQuery(input),
      },
      providerId: input.providerId,
    });
  },
};

export default action;
