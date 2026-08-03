import type { ActionDefinition } from "@w6w/types";
import { TallyClient } from "../lib/client.ts";
import { formIdParam } from "../lib/params.ts";

interface Input {
  formId: string;
  questionId: string;
  title: string;
}

/**
 * PATCH /forms/{formId}/questions/{questionId} — retitle a question.
 *
 * `title` is the only field this endpoint accepts. Anything else about a
 * question (its type, options, validation) lives in its block payload and is
 * changed through Update Blocks.
 */
const questionUpdate: ActionDefinition<Input, Record<string, unknown>> = {
  key: "question-update",
  type: "perform",
  resource: "question",
  title: "Update Question",
  description: "Change a question's title. Only the title is editable through this endpoint.",
  idempotent: true,
  params: [
    formIdParam,
    {
      key: "questionId",
      label: "Question ID",
      type: "string",
      required: true,
      hint: "Get IDs from Get Many Questions.",
    },
    { key: "title", label: "Title", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Question ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "question", type: "object", label: "The updated question" },
  ],

  async execute(input, ctx) {
    const question = await new TallyClient(ctx).request<Record<string, unknown>>(
      `/forms/${encodeURIComponent(input.formId)}/questions/${
        encodeURIComponent(input.questionId)
      }`,
      { method: "PATCH", body: { title: input.title } },
    );
    return { id: question?.id, title: question?.title, question };
  },
};

export default questionUpdate;
