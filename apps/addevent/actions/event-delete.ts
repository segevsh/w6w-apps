import type { ActionDefinition } from "@w6w/types";
import { AddEventClient } from "../lib/client.ts";
import { eventIdParam } from "../lib/params.ts";

/**
 * `DELETE /events/{event_id}` — permanently delete an event. Cannot be undone.
 *
 * Answers `204` with no body. Idempotent in the sense the runtime cares about: the
 * end state after one call and after five is the same event gone. A repeat call on
 * an already-deleted id answers `404`, which surfaces as an error rather than being
 * swallowed, because it usually means the id was wrong rather than that the work was
 * already done.
 */
interface Input {
  eventId: string;
}

const eventDelete: ActionDefinition<Input> = {
  key: "event-delete",
  type: "perform",
  resource: "event",
  title: "Delete Event",
  description: "Permanently delete an event by id. Cannot be undone.",
  idempotent: true,
  params: [eventIdParam],
  output: [
    { key: "eventId", type: "string", label: "Event deleted" },
    { key: "status", type: "number", label: "HTTP status — 204 on success" },
  ],

  async execute(input, ctx) {
    const status = await new AddEventClient(ctx).status(
      `/events/${encodeURIComponent(input.eventId)}`,
      { method: "DELETE" },
    );
    return { eventId: input.eventId, status };
  },
};

export default eventDelete;
