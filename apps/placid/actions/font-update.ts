import type { ActionDefinition } from "@w6w/types";
import { PlacidClient, required } from "../lib/client.ts";

interface Input {
  uuid: string;
  title: string;
}

/** `PATCH /fonts/{uuid}` — only the display title can change (max 200 chars). */
const action: ActionDefinition<Input, unknown> = {
  key: "font-update",
  type: "perform",
  resource: "font",
  title: "Update Font",
  description: "Rename a custom font. The font file itself cannot be replaced.",
  idempotent: true,
  params: [
    { key: "uuid", label: "Font UUID", type: "string", required: true },
    {
      key: "title",
      label: "Title",
      type: "string",
      required: true,
      validation: { maxLength: 200 },
    },
  ],
  output: [
    { key: "uuid", type: "string", label: "Font code (use as fontFamily)" },
    { key: "title", type: "string", label: "Title" },
    { key: "filename", type: "string", label: "Filename" },
    { key: "created_at", type: "string", label: "Uploaded at" },
  ],

  async execute(input, ctx) {
    const id = required(input.uuid, "uuid");
    return await new PlacidClient(ctx).json(`/fonts/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: { title: required(input.title, "title") },
    });
  },
};

export default action;
