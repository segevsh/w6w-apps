import type { ActionDefinition } from "@w6w/types";
import { GoogleBusinessProfileClient, QANDA_URL } from "../lib/client.ts";

interface Input {
  locationId: string;
  questionId: string;
}

/**
 * `locations.questions.answers.delete` — https://developers.google.com/my-business/reference/qanda/rest/v1/locations.questions.answers/delete
 *
 * Deletes the answer written by the *connected user* to the given question
 * (the API is scoped to the caller's own answer — there is no answer-id
 * parameter).
 */
const deleteAnswer: ActionDefinition<Input, { success: true }> = {
  key: "delete-answer",
  type: "perform",
  resource: "answer",
  title: "Delete Answer",
  description: "Delete the connected user's answer to a question.",
  idempotent: true,
  params: [
    { key: "locationId", label: "Location ID", type: "string", required: true },
    { key: "questionId", label: "Question ID", type: "string", required: true },
  ],
  output: [{ key: "success", type: "boolean", label: "Success" }],

  async execute(input, ctx) {
    const client = new GoogleBusinessProfileClient(ctx);
    await client.request<void>(
      QANDA_URL,
      `/locations/${input.locationId}/questions/${input.questionId}/answers:delete`,
      { method: "DELETE" },
    );
    return { success: true };
  },
};

export default deleteAnswer;
