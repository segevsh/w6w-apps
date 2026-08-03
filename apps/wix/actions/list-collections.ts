import type { ActionDefinition } from "@w6w/types";
import {
  OFFSET_PAGE_PARAMS,
  type OffsetPageInput,
  offsetPageQuery,
  PAGING_OUTPUT,
  WixClient,
} from "../lib/client.ts";

interface Input extends OffsetPageInput {
  sortFieldName?: string;
  sortOrder?: "ASC" | "DESC";
}

/** `GET /wix-data/v2/collections` — handler `wix.data.v2.data_collection:ListDataCollections`. */
const listCollections: ActionDefinition<Input> = {
  key: "list-collections",
  type: "search",
  resource: "collection",
  title: "List Collections",
  description:
    "List the site's CMS data collections. Start here — a collection's id is what every data-item action needs.",
  params: [
    {
      key: "sortFieldName",
      label: "Sort field",
      type: "string",
      hint: "Field of the collection object to sort by, e.g. `id` or `displayName`.",
    },
    {
      key: "sortOrder",
      label: "Sort order",
      type: "select",
      options: [
        { value: "ASC", label: "Ascending" },
        { value: "DESC", label: "Descending" },
      ],
    },
    ...OFFSET_PAGE_PARAMS,
  ],
  output: [
    { key: "collections", type: "array", label: "Data collections" },
    ...PAGING_OUTPUT,
  ],

  execute(input, ctx) {
    return new WixClient(ctx).request("/wix-data/v2/collections", {
      query: {
        ...offsetPageQuery(input),
        "sort.fieldName": input.sortFieldName,
        "sort.order": input.sortOrder,
      },
    });
  },
};

export default listCollections;
