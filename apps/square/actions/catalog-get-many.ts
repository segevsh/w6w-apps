import type { ActionDefinition } from "@w6w/types";
import { SquareClient, unset } from "../lib/client.ts";
import { cursor, listOutput } from "../lib/params.ts";

interface Input {
  types?: string[];
  catalogVersion?: number;
  cursor?: string;
}

/**
 * `GET /v2/catalog/list` (ListCatalog).
 *
 * The flat enumeration of a seller's catalog. `types` is a comma-separated list
 * of `CatalogObjectType` values, and the options below are the subset a
 * workflow usually reaches for. The full enum also covers pricing rules,
 * product sets, time periods, subscription plans, availability periods, quick
 * amounts and custom attribute definitions; those are catalog *configuration*
 * rather than catalog contents, and are omitted here rather than offered as a
 * list nobody can act on.
 *
 * Page size is fixed by Square at 100 and is not a parameter — the only paging
 * control is the cursor.
 */
const catalogGetMany: ActionDefinition<Input> = {
  key: "catalog-get-many",
  type: "search",
  resource: "catalog",
  title: "List Catalog Objects",
  description:
    "List catalog objects — items, variations, categories, taxes, discounts, modifiers. Page size is fixed at 100.",
  params: [
    {
      key: "types",
      label: "Object types",
      type: "multiselect",
      hint: "Leave empty for Square's default set. Case-insensitive.",
      options: [
        { value: "ITEM", label: "Item" },
        { value: "ITEM_VARIATION", label: "Item variation" },
        { value: "CATEGORY", label: "Category" },
        { value: "IMAGE", label: "Image" },
        { value: "TAX", label: "Tax" },
        { value: "DISCOUNT", label: "Discount" },
        { value: "MODIFIER", label: "Modifier" },
        { value: "MODIFIER_LIST", label: "Modifier list" },
        { value: "ITEM_OPTION", label: "Item option" },
        { value: "ITEM_OPTION_VAL", label: "Item option value" },
        { value: "MEASUREMENT_UNIT", label: "Measurement unit" },
      ],
    },
    {
      key: "catalogVersion",
      label: "Catalog version",
      type: "number",
      hint: "Retrieve a historical version of the objects. Leave empty for current.",
      validation: { min: 0, integer: true },
    },
    cursor,
  ],
  output: listOutput("objects", "Catalog objects"),

  execute(input, ctx) {
    return new SquareClient(ctx).request("/catalog/list", {
      query: {
        types: input.types?.length ? input.types.join(",") : undefined,
        catalog_version: input.catalogVersion,
        cursor: unset(input.cursor),
      },
    });
  },
};

export default catalogGetMany;
