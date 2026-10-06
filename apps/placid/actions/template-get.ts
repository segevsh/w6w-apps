import type { ActionDefinition } from "@w6w/types";
import { PlacidClient, required } from "../lib/client.ts";

interface Input {
  template_uuid: string;
}

/** `GET /templates/{template_uuid}` — includes the dynamic `layers` (name and type) to fill when rendering. */
const action: ActionDefinition<Input, unknown> = {
  key: "template-get",
  type: "read",
  resource: "template",
  title: "Get Template",
  description: "Retrieve a template by UUID, including the names and types of its dynamic layers.",
  params: [
    { key: "template_uuid", label: "Template UUID", type: "string", required: true },
  ],
  output: [
    { key: "uuid", type: "string", label: "UUID" },
    { key: "title", type: "string", label: "Title" },
    { key: "thumbnail", type: "string", label: "Thumbnail URL" },
    { key: "tags", type: "array", label: "Tags" },
    { key: "layers", type: "array", label: "Layers (name, type)" },
  ],

  async execute(input, ctx) {
    const id = required(input.template_uuid, "template_uuid");
    return await new PlacidClient(ctx).json(`/templates/${encodeURIComponent(id)}`);
  },
};

export default action;
