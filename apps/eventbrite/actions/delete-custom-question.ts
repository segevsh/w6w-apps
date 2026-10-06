import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";

interface Input {
  eventId: string;
  questionId: string;
}

const deleteCustomQuestion: ActionDefinition<Input> = {
  key: "delete-custom-question",
  type: "perform",
  resource: "question",
  title: "Delete Custom Question",
  description: "Deletes a custom question from the event on Eventbrite.",
  idempotent: true,
  params: [
    { key: "eventId", label: "Event ID", type: "string", required: true },
    { key: "questionId", label: "Question ID", type: "string", required: true },
  ],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],
  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request(
      `/events/${encodeURIComponent(input.eventId)}/questions/${
        encodeURIComponent(input.questionId)
      }/`,
      { method: "DELETE" },
    );
  },
};

export default deleteCustomQuestion;
