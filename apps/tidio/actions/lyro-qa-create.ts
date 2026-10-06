import type { ActionDefinition } from "@w6w/types";
import { call } from "../lib/client.ts";
import { str, text } from "../lib/params.ts";

/** `POST /lyro/data-sources/qa` -> 201 `{id}`. */
type Input = { title: string; content: string };

const lyroQaCreate: ActionDefinition<Input> = {
  key: "lyro-qa-create",
  type: "perform",
  resource: "lyro",
  title: "Create Lyro Q&A",
  description: "Add a question-and-answer item to the Lyro AI Agent's knowledge.",
  idempotent: false,
  params: [
    str("title", "Question", {
      required: true,
      hint: "Max 500 characters.",
      validation: { maxLength: 500 },
    }),
    text("content", "Answer", { required: true }),
  ],
  output: [{ key: "id", type: "string", label: "New data source ID" }],
  async execute(input, ctx) {
    if (!input.title?.trim() || !input.content?.trim()) {
      throw new Error("title and content are required");
    }
    const res = await call(ctx, "POST", "/lyro/data-sources/qa", {
      body: { title: input.title, content: input.content },
    });
    return { id: (res as { id?: string } | null)?.id ?? null };
  },
};

export default lyroQaCreate;
