import type { ActionDefinition } from "@w6w/types";
import { PlacidClient, required } from "../lib/client.ts";

interface Input {
  uuid: string;
  force?: boolean;
}

/** `DELETE /fonts/{uuid}` — 409 (with `templates_using_font`) while a template references it, unless `force=1`. */
const action: ActionDefinition<Input, { uuid: string; deleted: true }> = {
  key: "font-delete",
  type: "perform",
  resource: "font",
  title: "Delete Font",
  description:
    "Delete a custom font. Refused with 409 while templates still use it, unless force is set (those templates then fall back to the default font).",
  idempotent: true,
  params: [
    { key: "uuid", label: "Font UUID", type: "string", required: true },
    {
      key: "force",
      label: "Force",
      type: "boolean",
      hint:
        "Delete even if templates still reference the font; their text falls back to the default font.",
    },
  ],
  output: [
    { key: "uuid", type: "string", label: "UUID" },
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    const id = required(input.uuid, "uuid");
    await new PlacidClient(ctx).json(`/fonts/${encodeURIComponent(id)}`, {
      method: "DELETE",
      query: { force: input.force ? 1 : undefined },
    });
    return { uuid: id, deleted: true };
  },
};

export default action;
