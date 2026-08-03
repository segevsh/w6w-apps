import type { ActionDefinition } from "@w6w/types";
import { csvString, DiscourseClient } from "../lib/client.ts";
import { successOutput } from "../lib/params.ts";

/**
 * `PUT /groups/{id}/members.json` — add users to a group.
 *
 * Two shapes worth stating, both from the endpoint's own schema:
 *
 *  - The route is keyed on the group's **numeric id**, while `group-get` is
 *    keyed on its name. That is Discourse's split, not one introduced here; run
 *    `group-get` first if you only have the name.
 *  - `usernames` is a **comma-separated string**, not a JSON array. The schema
 *    types it `string` and gives `username1,username2` as the example. Sending
 *    an array is a silent no-op on some Discourse versions, so `csvString`
 *    builds the exact wire form and the unit test pins it.
 *
 * The verb really is PUT for "add" and DELETE for "remove" on the same path.
 * A PUT that appends rather than replaces is unusual, and it is why this action
 * is called "Add Members" rather than "Set Members": it does not remove anyone.
 */
interface Input {
  groupId: number | string;
  usernames: string;
}

const groupAddMembers: ActionDefinition<Input> = {
  key: "group-add-members",
  type: "perform",
  resource: "group",
  title: "Add Group Members",
  description: "Add one or more users to a group. Existing members are left alone.",
  // Adding a user who is already a member converges on the same membership set.
  idempotent: true,
  params: [
    {
      key: "groupId",
      label: "Group ID",
      type: "number",
      required: true,
      hint: "Numeric id — `group-get` returns it for a group name.",
      validation: { integer: true },
    },
    {
      key: "usernames",
      label: "Usernames",
      type: "string",
      required: true,
      placeholder: "alice,bob",
      hint: "Comma-separated. Discourse takes a string here, not a list.",
    },
  ],
  output: successOutput,

  execute(input, ctx) {
    return new DiscourseClient(ctx).request(
      `/groups/${encodeURIComponent(String(input.groupId))}/members.json`,
      {
        method: "PUT",
        // A comma-separated STRING, per the endpoint's schema — not an array.
        body: { usernames: csvString(input.usernames) },
      },
    );
  },
};

export default groupAddMembers;
