import type { ActionDefinition } from "@w6w/types";
import { compact, PlacidClient, required, toList } from "../lib/client.ts";

interface Input {
  collection_id: string;
  title?: string;
  custom_data?: string;
  template_uuids?: string[] | string;
  add_template_uuids?: string[] | string;
  remove_template_uuids?: string[] | string;
}

/** `PATCH /collections/{collection_id}` — `template_uuids` REPLACES the whole list; `add_`/`remove_template_uuids` change it incrementally. */
const action: ActionDefinition<Input, unknown> = {
  key: "collection-update",
  type: "perform",
  resource: "collection",
  title: "Update Collection",
  description:
    "Update a collection's title or custom data, replace its template list, or add and remove templates incrementally.",
  idempotent: true,
  params: [
    { key: "collection_id", label: "Collection ID", type: "string", required: true },
    { key: "title", label: "Title", type: "string", validation: { maxLength: 255 } },
    { key: "custom_data", label: "Custom data", type: "string", hint: "Up to 1024 characters." },
    {
      key: "template_uuids",
      label: "Replace template UUIDs",
      type: "multiselect",
      hint: "REPLACES the entire list of templates in the collection.",
    },
    { key: "add_template_uuids", label: "Add template UUIDs", type: "multiselect" },
    { key: "remove_template_uuids", label: "Remove template UUIDs", type: "multiselect" },
  ],
  output: [
    { key: "id", type: "string", label: "ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "custom_data", type: "string", label: "Custom data" },
    { key: "template_uuids", type: "array", label: "Template UUIDs" },
  ],

  async execute(input, ctx) {
    const id = required(input.collection_id, "collection_id");
    const body = compact({
      title: input.title,
      custom_data: input.custom_data,
      template_uuids: toList(input.template_uuids),
      add_template_uuids: toList(input.add_template_uuids),
      remove_template_uuids: toList(input.remove_template_uuids),
    });
    if (Object.keys(body).length === 0) throw new Error("nothing to update");
    return await new PlacidClient(ctx).json(`/collections/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body,
    });
  },
};

export default action;
