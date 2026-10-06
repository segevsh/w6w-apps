import type { ActionDefinition } from "@w6w/types";
import { compact, PlacidClient, toList } from "../lib/client.ts";

interface Input {
  title?: string;
  width?: number;
  height?: number;
  tags?: string[] | string;
  custom_data?: string;
  from_template?: string;
  add_to_collections?: string[] | string;
}

/** `POST /templates` — create a blank template, or duplicate one with `from_template` (which overrides title, width and height). */
const action: ActionDefinition<Input, unknown> = {
  key: "template-create",
  type: "perform",
  resource: "template",
  title: "Create Template",
  description:
    "Create a template with a canvas size, or duplicate an existing one by UUID. Not idempotent: each call makes a new template.",
  idempotent: false,
  params: [
    { key: "title", label: "Title", type: "string" },
    { key: "width", label: "Width (px)", type: "number" },
    { key: "height", label: "Height (px)", type: "number" },
    {
      key: "tags",
      label: "Tags",
      type: "multiselect",
      hint: "Up to 10 (a comma-separated string also works).",
    },
    {
      key: "custom_data",
      label: "Custom data",
      type: "string",
      hint: "Any reference value, up to 255 characters; a serialized JSON object is fine.",
    },
    {
      key: "from_template",
      label: "Duplicate from template UUID",
      type: "string",
      hint: "Overrides title, width and height with the source template's.",
    },
    { key: "add_to_collections", label: "Add to collection IDs", type: "multiselect" },
  ],
  output: [
    { key: "uuid", type: "string", label: "UUID" },
    { key: "title", type: "string", label: "Title" },
    { key: "layers", type: "array", label: "Layers" },
  ],

  async execute(input, ctx) {
    if (!input.from_template && !input.title) {
      throw new Error("`title` is required unless `from_template` is given");
    }
    return await new PlacidClient(ctx).json("/templates", {
      method: "POST",
      body: compact({
        title: input.title,
        width: input.width,
        height: input.height,
        tags: toList(input.tags),
        custom_data: input.custom_data,
        from_template: input.from_template,
        add_to_collections: toList(input.add_to_collections),
      }),
    });
  },
};

export default action;
