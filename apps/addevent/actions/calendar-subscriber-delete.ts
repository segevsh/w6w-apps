import type { ActionDefinition } from "@w6w/types";
import { AddEventClient } from "../lib/client.ts";
import { subscriberIdParam } from "../lib/params.ts";

/**
 * `DELETE /subscribers/{subscriber_id}` — permanently delete (unsubscribe) a
 * calendar subscriber. Cannot be undone. Answers `204` with no body.
 */
interface Input {
  subscriberId: string;
}

const calendarSubscriberDelete: ActionDefinition<Input> = {
  key: "calendar-subscriber-delete",
  type: "perform",
  resource: "calendar-subscriber",
  title: "Delete Calendar Subscriber",
  description: "Permanently delete (unsubscribe) a calendar subscriber by id. Cannot be undone.",
  idempotent: true,
  params: [subscriberIdParam],
  output: [
    { key: "subscriberId", type: "string", label: "Subscriber deleted" },
    { key: "status", type: "number", label: "HTTP status — 204 on success" },
  ],

  async execute(input, ctx) {
    const status = await new AddEventClient(ctx).status(
      `/subscribers/${encodeURIComponent(input.subscriberId)}`,
      { method: "DELETE" },
    );
    return { subscriberId: input.subscriberId, status };
  },
};

export default calendarSubscriberDelete;
