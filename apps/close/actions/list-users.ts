import type { ActionDefinition } from "@w6w/types";
import {
  CloseClient,
  type CloseList,
  compact,
  PAGE_OUTPUT,
  PAGE_PARAMS,
  type PageInput,
  pageQuery,
} from "../lib/client.ts";

interface Input extends PageInput {
  orderBy?: string;
}

/**
 * `GET /user/` — the users in your organization.
 *
 * This exists to make the other actions usable rather than as an end in itself:
 * `assigned_to` on a Task and `user_id` on an Opportunity, Note or Call all want
 * a `user_...` id, and there is nowhere else to get one. A workflow that assigns
 * work round-robin or by name starts here.
 *
 * `_order_by` accepts exactly two documented values — `last_name,first_name` and
 * `first_name,last_name` — so unlike the other list actions this one is a
 * `select`, not free text.
 *
 * The single-user counterpart, `GET /me/`, is not exposed as an action: it is
 * already exercised by the auth `test` hook (proving the credential is live) and
 * by the quota health check, and a workflow that needs to know which user the
 * key belongs to can read it off the Connection label instead of spending a
 * call.
 */
const listUsers: ActionDefinition<Input> = {
  key: "list-users",
  type: "search",
  resource: "user",
  title: "List Users",
  description:
    "List the users in your Close organization. Use it to resolve the `user_...` ids that task " +
    "assignment and record ownership need.",
  params: [
    {
      key: "orderBy",
      label: "Order by",
      type: "select",
      options: [
        { value: "last_name,first_name", label: "Last name, first name" },
        { value: "first_name,last_name", label: "First name, last name" },
      ],
      hint: "Close documents these two orderings only.",
    },
    ...PAGE_PARAMS,
  ],
  output: PAGE_OUTPUT,

  execute(input, ctx) {
    return new CloseClient(ctx).request<CloseList>("/user/", {
      query: compact({ ...pageQuery(input), _order_by: input.orderBy }),
    });
  },
};

export default listUsers;
