import type { ActionDefinition } from "@w6w/types";
import { MailerLiteClient, type MailerLiteEnvelope } from "../lib/client.ts";

interface Input {
  subscriberId: string;
  groupId: string;
}

/**
 * `POST /api/subscribers/{subscriber_id}/groups/{group_id}` — note the path
 * hangs off the SUBSCRIBER, not the group, and carries no body. 200 when the
 * subscriber was already a member, 201 when newly assigned; either way the
 * end state is the same, so this is idempotent.
 */
const assignSubscriberToGroup: ActionDefinition<Input> = {
  key: "assign-subscriber-to-group",
  type: "perform",
  resource: "group",
  title: "Assign Subscriber to Group",
  description: "Add an existing subscriber to an existing group.",
  idempotent: true,
  params: [
    { key: "subscriberId", label: "Subscriber ID", type: "string", required: true },
    { key: "groupId", label: "Group ID", type: "string", required: true },
  ],
  output: [{ key: "data", type: "object", label: "Group" }],

  execute(input, ctx) {
    const client = new MailerLiteClient(ctx);
    return client.request<MailerLiteEnvelope>(
      `/subscribers/${encodeURIComponent(input.subscriberId)}/groups/${
        encodeURIComponent(input.groupId)
      }`,
      { method: "POST" },
    );
  },
};

export default assignSubscriberToGroup;
