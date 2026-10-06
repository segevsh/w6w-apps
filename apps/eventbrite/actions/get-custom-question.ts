import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";

interface Input {
  eventId: string;
  questionId: string;
}

const getCustomQuestion: ActionDefinition<Input> = {
  key: "get-custom-question",
  type: "read",
  resource: "question",
  title: "Get Custom Question",
  description: "Retrieve a custom question by event and question ID.",
  idempotent: true,
  params: [
    { key: "eventId", label: "Event ID", type: "string", required: true },
    { key: "questionId", label: "Question ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "ID" },
    { key: "question", type: "object", label: "Question text" },
    { key: "type", type: "string", label: "Type" },
    { key: "required", type: "boolean", label: "Required" },
    { key: "respondent", type: "string", label: "Respondent" },
    { key: "choices", type: "array", label: "Choices" },
  ],
  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request(
      `/events/${encodeURIComponent(input.eventId)}/questions/${
        encodeURIComponent(input.questionId)
      }/`,
    );
  },
};

export default getCustomQuestion;
