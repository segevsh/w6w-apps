import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";

interface Input {
  eventId: string;
  questionId: string;
}

// NOTE: blueprint path is `/event/...` (singular); we use `/events/...` — see get-default-question.
const deleteDefaultQuestion: ActionDefinition<Input> = {
  key: "delete-default-question",
  type: "perform",
  resource: "question",
  title: "Delete Default Question",
  description: "Deactivates a default (canned) question on the event on Eventbrite.",
  idempotent: true,
  params: [
    { key: "eventId", label: "Event ID", type: "string", required: true },
    { key: "questionId", label: "Question ID", type: "string", required: true },
  ],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],
  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request(
      `/events/${encodeURIComponent(input.eventId)}/canned_questions/${
        encodeURIComponent(input.questionId)
      }/`,
      { method: "DELETE" },
    );
  },
};

export default deleteDefaultQuestion;
