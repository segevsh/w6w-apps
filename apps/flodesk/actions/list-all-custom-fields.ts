import type { ActionDefinition } from "@w6w/types";
import { FlodeskClient } from "../lib/client.ts";

type Input = Record<string, never>;

/**
 * `GET /v1/custom-fields/all` — every custom field in one call, as a **bare
 * array** with no `meta` envelope and no paging.
 *
 * This is the one to reach for when populating the `custom_fields` object of a
 * subscriber upsert, since that object is keyed on each field's `key` rather
 * than its `label`, and you need the complete key set to build it.
 */
const listAllCustomFields: ActionDefinition<Input> = {
  key: "list-all-custom-fields",
  type: "read",
  resource: "custom-field",
  title: "List All Custom Fields",
  description:
    "Return every custom field in one call, as a bare array of `{ key, label }` with no pagination. Use the `key` values when writing a subscriber's `custom_fields`.",
  params: [],
  output: [{ key: "customFields", type: "array", label: "Custom fields" }],

  execute(_input, ctx) {
    return new FlodeskClient(ctx).request<Array<{ key?: string; label?: string }>>(
      "/custom-fields/all",
    );
  },
};

export default listAllCustomFields;
