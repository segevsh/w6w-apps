import type { TriggerDefinition } from "@w6w/types";
import customFieldList from "../actions/custom-field-list.ts";
import { readAllPages, snapshotAdded } from "../lib/triggers.ts";

/** A nation defines a bounded set of custom fields; the whole list is diffed. */
const trigger: TriggerDefinition = {
  key: "new-custom-field",
  title: "New Custom Field",
  description: "The run gets each custom field newly defined in the nation.",
  output: [
    { key: "id", type: "string", label: "Custom field ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "slug", type: "string", label: "Slug" },
    { key: "field_type", type: "string", label: "Field type" },
    { key: "resource_type", type: "string", label: "Applies to" },
  ],
  sample: {
    id: "61",
    type: "custom_fields",
    name: "Preferred contact",
    slug: "preferred_contact",
    field_type: "text",
    resource_type: "signup",
  },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const rows = await readAllPages(async (pageNumber) => {
      const out = await customFieldList.execute({ pageSize: 100, pageNumber }, ctx) as {
        items?: Record<string, unknown>[];
      };
      return out.items ?? [];
    }, "new-custom-field");
    return snapshotAdded(state, rows);
  },
};

export default trigger;
