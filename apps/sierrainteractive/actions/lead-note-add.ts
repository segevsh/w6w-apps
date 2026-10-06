import type { ActionDefinition } from "@w6w/types";
import { encodeId, SierraClient } from "../lib/client.ts";

interface Input {
  leadIdOrEmail: string;
  message: string;
  shouldNotify?: string;
}

/** `POST /zapier/leads/{leadIdOrEmail}/note` — body `NoteApiModel {message, shouldNotify}`. */
const leadNoteAdd: ActionDefinition<Input> = {
  key: "lead-note-add",
  type: "perform",
  resource: "note",
  title: "Add Lead Note",
  description: "Add a note to a lead's timeline.",
  idempotent: false,
  params: [
    { key: "leadIdOrEmail", label: "Lead ID or email", type: "string", required: true },
    { key: "message", label: "Note", type: "text", required: true },
    {
      key: "shouldNotify",
      label: "Notify the assigned agent",
      type: "select",
      options: [{ value: "true", label: "Yes" }, { value: "false", label: "No" }],
      hint: "Sierra types this field as a string; leave empty for Sierra's default.",
    },
  ],
  output: [{ key: "data", type: "object", label: "Sierra's response" }],

  async execute(input, ctx) {
    const body: Record<string, unknown> = { message: input.message };
    if (input.shouldNotify) body.shouldNotify = input.shouldNotify;
    return await new SierraClient(ctx).request(
      "POST",
      `/zapier/leads/${encodeId(input.leadIdOrEmail)}/note`,
      body,
    );
  },
};

export default leadNoteAdd;
