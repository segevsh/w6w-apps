import type { ActionDefinition } from "@w6w/types";
import { compact, PlacidClient, required, toList } from "../lib/client.ts";

interface Input {
  title: string;
  custom_data?: string;
  template_uuids?: string[] | string;
}

/** `POST /collections` — title (max 255 chars), custom_data (max 1024), up to 500 template UUIDs. */
const action: ActionDefinition<Input, unknown> = {
  key: "collection-create",
  type: "perform",
  resource: "collection",
  title: "Create Collection",
  description:
    "Create a template collection, optionally seeded with template UUIDs (max 500). Not idempotent.",
  idempotent: false,
  params: [
    {
      key: "title",
      label: "Title",
      type: "string",
      required: true,
      validation: { maxLength: 255 },
    },
    {
      key: "custom_data",
      label: "Custom data",
      type: "string",
      hint: "Up to 1024 characters; a serialized JSON object is fine.",
    },
    { key: "template_uuids", label: "Template UUIDs", type: "multiselect", hint: "Max 500." },
  ],
  output: [
    { key: "id", type: "string", label: "ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "custom_data", type: "string", label: "Custom data" },
    { key: "template_uuids", type: "array", label: "Template UUIDs" },
  ],

  async execute(input, ctx) {
    return await new PlacidClient(ctx).json("/collections", {
      method: "POST",
      body: compact({
        title: required(input.title, "title"),
        custom_data: input.custom_data,
        template_uuids: toList(input.template_uuids),
      }),
    });
  },
};

export default action;
