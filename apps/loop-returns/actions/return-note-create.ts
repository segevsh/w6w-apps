import type { ActionDefinition } from "@w6w/types";
import { encodeId, LoopClient } from "../lib/client.ts";

/**
 * Create Return Note.
 *
 * `POST /warehouse/return/{id}/note` with `{content}` (max 255 characters).
 */
interface Input {
  returnId: number;
  content: string;
}

const action: ActionDefinition<Input> = {
  key: "return-note-create",
  type: "perform",
  resource: "return",
  title: "Create Return Note",
  description: "Add a note to a return's timeline.",
  idempotent: false,
  params: [
    {
      key: "returnId",
      label: "Return ID",
      type: "number",
      required: true,
      hint: "Loop's numeric return id (the `id` of a return from Return List / Get Return).",
      validation: { integer: true, min: 1 },
    },
    {
      key: "content",
      label: "Note",
      type: "string",
      required: true,
      hint: "The note text, up to 255 characters.",
      validation: { maxLength: 255 },
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "True when the note was saved" },
    { key: "returnId", type: "number", label: "Return ID" },
  ],

  async execute(input, ctx) {
    const res = await new LoopClient(ctx).post(
      `/warehouse/return/${encodeId(input.returnId)}/note`,
      { content: input.content },
    );
    return { success: res === true, returnId: input.returnId };
  },
};

export default action;
