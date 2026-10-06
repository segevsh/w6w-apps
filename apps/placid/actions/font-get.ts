import type { ActionDefinition } from "@w6w/types";
import { PlacidClient, required } from "../lib/client.ts";

interface Input {
  uuid: string;
  include_legacy?: boolean;
}

/** `GET /fonts/{uuid}` — 404 if it is not in this project. */
const action: ActionDefinition<Input, unknown> = {
  key: "font-get",
  type: "read",
  resource: "font",
  title: "Get Font",
  description: "Retrieve a custom font by its uuid (font code).",
  params: [
    { key: "uuid", label: "Font UUID", type: "string", required: true },
    { key: "include_legacy", label: "Allow legacy fonts", type: "boolean" },
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
      query: { include_legacy: input.include_legacy ? 1 : undefined },
    });
  },
};

export default action;
