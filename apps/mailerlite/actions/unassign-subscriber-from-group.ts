import type { ActionDefinition } from "@w6w/types";
import { MailerLiteClient } from "../lib/client.ts";

interface Input {
  subscriberId: string;
  groupId: string;
}

/**
 * `DELETE /api/subscribers/{subscriber_id}/groups/{group_id}` — 204 No Content.
 * Removes the membership only; the subscriber itself is untouched.
 */
const unassignSubscriberFromGroup: ActionDefinition<Input> = {
  key: "unassign-subscriber-from-group",
  type: "perform",
  resource: "group",
  title: "Unassign Subscriber from Group",
  description: "Remove a subscriber from a group. The subscriber itself is not deleted.",
  idempotent: true,
  params: [
    { key: "subscriberId", label: "Subscriber ID", type: "string", required: true },
    { key: "groupId", label: "Group ID", type: "string", required: true },
  ],
  output: [{ key: "success", type: "boolean", label: "Removed" }],

  async execute(input, ctx) {
    const client = new MailerLiteClient(ctx);
    await client.request(
      `/subscribers/${encodeURIComponent(input.subscriberId)}/groups/${
        encodeURIComponent(input.groupId)
      }`,
      { method: "DELETE" },
    );
    return { success: true };
  },
};

export default unassignSubscriberFromGroup;
