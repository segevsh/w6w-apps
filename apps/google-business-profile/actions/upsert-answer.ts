import type { ActionDefinition } from "@w6w/types";
import { GoogleBusinessProfileClient, QANDA_URL } from "../lib/client.ts";

interface Input {
  locationId: string;
  questionId: string;
  text: string;
}

/**
 * `locations.questions.answers.upsert` — https://developers.google.com/my-business/reference/qanda/rest/v1/locations.questions.answers/upsert
 *
 * "Upsert" because the API allows only one answer per (question, author):
 * calling this again for the same question replaces the connected user's
 * existing answer rather than adding a second one.
 */
const upsertAnswer: ActionDefinition<Input> = {
  key: "upsert-answer",
  type: "perform",
  resource: "answer",
  title: "Answer Question",
  description:
    "Write or replace the connected user's answer to a question. There can be only one answer per author per question, so calling this again replaces the previous text.",
  // Same text sent twice replaces the same answer with itself.
  idempotent: true,
  params: [
    { key: "locationId", label: "Location ID", type: "string", required: true },
    { key: "questionId", label: "Question ID", type: "string", required: true },
    { key: "text", label: "Answer text", type: "text", required: true },
  ],
  output: [
    { key: "name", type: "string", label: "Resource name" },
    { key: "text", type: "string", label: "Answer text" },
  ],

  execute(input, ctx) {
    const client = new GoogleBusinessProfileClient(ctx);
    return client.request(
      QANDA_URL,
      `/locations/${input.locationId}/questions/${input.questionId}/answers:upsert`,
      {
        method: "POST",
        body: { answer: { text: input.text } },
      },
    );
  },
};

export default upsertAnswer;
