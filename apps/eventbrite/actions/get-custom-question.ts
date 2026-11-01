import type { ActionDefinition } from "@w6w/types";
import { QUESTION_OUTPUT, QUESTION_SAMPLE } from "../lib/outputs.ts";
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
  output: QUESTION_OUTPUT,
  sample: QUESTION_SAMPLE,
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
