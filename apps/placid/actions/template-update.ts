import type { ActionDefinition } from "@w6w/types";
import { compact, PlacidClient, required, toList } from "../lib/client.ts";

interface Input {
  template_uuid: string;
  title?: string;
  tags?: string[] | string;
  custom_data?: string;
}

/** `PATCH /templates/{template_uuid}` — title, tags and custom_data (the documented request body). */
const action: ActionDefinition<Input, unknown> = {
  key: "template-update",
  type: "perform",
  resource: "template",
  title: "Update Template",
  description:
    "Update a template's title, tags or custom data. Sending tags replaces the tag list.",
  idempotent: true,
  params: [
    { key: "template_uuid", label: "Template UUID", type: "string", required: true },
    { key: "title", label: "Title", type: "string" },
    { key: "tags", label: "Tags", type: "multiselect", hint: "Replaces the current tags." },
    { key: "custom_data", label: "Custom data", type: "string", hint: "Up to 255 characters." },
  ],
  output: [
    { key: "uuid", type: "string", label: "UUID" },
    { key: "title", type: "string", label: "Title" },
    { key: "tags", type: "array", label: "Tags" },
  ],

  async execute(input, ctx) {
    const id = required(input.template_uuid, "template_uuid");
    const body = compact({
      title: input.title,
      tags: toList(input.tags),
      custom_data: input.custom_data,
    });
    if (Object.keys(body).length === 0) {
      throw new Error("nothing to update: set title, tags or custom_data");
    }
    return await new PlacidClient(ctx).json(`/templates/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body,
    });
  },
};

export default action;
