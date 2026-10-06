import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";

interface Input {
  eventId: string;
  questionId: string;
}

// NOTE: the blueprint documents `/event/{event_id}/canned_questions/{question_id}` (singular
// `event`, no trailing slash); we use the plural form the API itself returns in `resource_uri`.
const getDefaultQuestion: ActionDefinition<Input> = {
  key: "get-default-question",
  type: "read",
  resource: "question",
  title: "Get Default Question",
  description: "Retrieve a default (canned) question of an event by its ID (e.g. `email`).",
  idempotent: true,
  params: [
    { key: "eventId", label: "Event ID", type: "string", required: true },
    {
      key: "questionId",
      label: "Question ID",
      type: "string",
      required: true,
      hint: "Canned question ID, e.g. `email`, `job_title`.",
    },
  ],
  output: [{ key: "question", type: "object", label: "Default question" }],
  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request(
      `/events/${encodeURIComponent(input.eventId)}/canned_questions/${
        encodeURIComponent(input.questionId)
      }/`,
    );
  },
};

export default getDefaultQuestion;
