import type { ActionDefinition } from "@w6w/types";
import { TallyClient } from "../lib/client.ts";
import { formIdParam } from "../lib/params.ts";

interface Input {
  formId: string;
}

/**
 * GET /forms/{formId}/questions — the form's questions.
 *
 * A *question* is the answerable projection of the form: only blocks that
 * collect input appear, each with `numberOfResponses` and a `fields` array.
 * That is a different view from Get Many Blocks, which returns the raw
 * layout including headings, images and page breaks.
 *
 * Unpaginated, and shaped `{ questions, hasResponses }` rather than the
 * `items` envelope.
 */
const questionGetMany: ActionDefinition<Input, Record<string, unknown>> = {
  key: "question-get-many",
  type: "read",
  resource: "question",
  title: "Get Many Questions",
  description: "List a form's questions, with response counts. Not paginated.",
  params: [formIdParam],
  output: [
    { key: "questions", type: "array", label: "Questions" },
    { key: "hasResponses", type: "boolean", label: "Whether the form has any responses" },
    { key: "count", type: "number", label: "Number of questions" },
  ],

  async execute(input, ctx) {
    const body = await new TallyClient(ctx).request<
      { questions?: unknown[]; hasResponses?: boolean }
    >(`/forms/${encodeURIComponent(input.formId)}/questions`);
    const questions = body?.questions ?? [];
    return { questions, hasResponses: body?.hasResponses, count: questions.length };
  },
};

export default questionGetMany;
