import type { ActionDefinition } from "@w6w/types";
import { BambooClient } from "../lib/client.ts";

/**
 * `GET /api/v1/meta/fields` — every employee field this company has.
 *
 * The keystone metadata call for this whole app. Because `fields` on the
 * employee reads is opt-in and there is no "give me everything", nothing else
 * works properly until you know the names — and the names are per-company, since
 * custom fields exist.
 *
 * Its response is what makes all three documented reference forms usable: "its
 * response includes `id`, `name`, and `alias` for every available field", which
 * are precisely the numeric-ID form (`1349`), the standard-name form
 * (`firstName`) and the custom-alias form (`customStartDate`) that
 * `FIELDS_PARAM` describes.
 */
const listFields: ActionDefinition<Record<string, never>> = {
  key: "list-fields",
  type: "search",
  resource: "field",
  title: "List Fields",
  description:
    "List every employee field available in this company, with its numeric id, standard name and " +
    "custom alias. Use it to build the `fields` value for the employee read actions.",
  params: [],
  output: [{ key: "fields", type: "array", label: "Field descriptors (`id`, `name`, `alias`)" }],

  execute(_input, ctx) {
    return new BambooClient(ctx).request("/meta/fields");
  },
};

export default listFields;
