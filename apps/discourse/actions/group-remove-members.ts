import type { ActionDefinition } from "@w6w/types";
import { csvString, DiscourseClient } from "../lib/client.ts";
import { successOutput } from "../lib/params.ts";

/**
 * `DELETE /groups/{id}/members.json` — remove users from a group.
 *
 * The mirror image of `group-add-members`, with the same two traps: numeric
 * group id in the path, and `usernames` as a **comma-separated string** rather
 * than a JSON array.
 *
 * The one shape that is genuinely unusual is that this DELETE carries a request
 * body. That is what the endpoint documents, and `lib/client.ts` sends it —
 * some HTTP clients quietly drop a body on DELETE, which would turn this into a
 * request that removes nobody and still answers 200.
 */
interface Input {
  groupId: number | string;
  usernames: string;
}

const groupRemoveMembers: ActionDefinition<Input> = {
  key: "group-remove-members",
  type: "perform",
  resource: "group",
  title: "Remove Group Members",
  description: "Remove one or more users from a group.",
  // Removing a non-member converges on the same membership set.
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
        method: "DELETE",
        // Yes, a body on a DELETE — that is what this endpoint documents.
        body: { usernames: csvString(input.usernames) },
      },
    );
  },
};

export default groupRemoveMembers;
