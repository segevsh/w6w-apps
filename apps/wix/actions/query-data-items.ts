import type { ActionDefinition } from "@w6w/types";
import {
  compact,
  OFFSET_PAGE_PARAMS,
  type OffsetPageInput,
  offsetPaging,
  PAGING_OUTPUT,
  WixClient,
} from "../lib/client.ts";

interface Input extends OffsetPageInput {
  dataCollectionId: string;
  filter?: Record<string, unknown>;
  sortFieldName?: string;
  sortOrder?: "ASC" | "DESC";
  fields?: string;
  returnTotalCount?: boolean;
  consistentRead?: boolean;
}

/** `POST /wix-data/v2/items/query` — handler `wix.data.v2.data_item:QueryDataItems`. */
const queryDataItems: ActionDefinition<Input> = {
  key: "query-data-items",
  type: "search",
  resource: "data-item",
  title: "Query Data Items",
  description:
    "Query a CMS collection with a filter, sort and paging. The main read path for Wix Data.",
  params: [
    {
      key: "dataCollectionId",
      label: "Collection ID",
      type: "string",
      required: true,
    },
    {
      key: "filter",
      label: "Filter",
      type: "json",
      hint:
        'Wix API Query Language, e.g. `{"state": "California"}` or `{"population": {"$gt": 1000}}`. Date values take the form `{"$date": "2026-05-05T00:00:00.000Z"}`.',
    },
    { key: "sortFieldName", label: "Sort field", type: "string" },
    {
      key: "sortOrder",
      label: "Sort order",
      type: "select",
      options: [
        { value: "ASC", label: "Ascending" },
        { value: "DESC", label: "Descending" },
      ],
    },
    {
      key: "fields",
      label: "Fields",
      type: "string",
      hint: "Comma-separated field projection. `_id` is always returned.",
    },
    {
      key: "returnTotalCount",
      label: "Return total count",
      type: "boolean",
      hint: "Adds `pagingMetadata.total`. Slower — request it on the first page only.",
    },
    {
      key: "consistentRead",
      label: "Consistent read",
      type: "boolean",
      hint: "Read from the primary database so very recent writes are visible.",
    },
    ...OFFSET_PAGE_PARAMS,
  ],
  output: [
    { key: "dataItems", type: "array", label: "Data items" },
    ...PAGING_OUTPUT,
  ],

  execute(input, ctx) {
    const fields = input.fields
      ? input.fields.split(",").map((f) => f.trim()).filter(Boolean)
      : undefined;
    const sort = input.sortFieldName
      ? [{ fieldName: input.sortFieldName, order: input.sortOrder ?? "ASC" }]
      : undefined;

    return new WixClient(ctx).request("/wix-data/v2/items/query", {
      method: "POST",
      body: compact({
        dataCollectionId: input.dataCollectionId,
        query: compact({
          filter: input.filter,
          sort,
          fields,
          paging: offsetPaging(input),
        }),
        returnTotalCount: input.returnTotalCount,
        consistentRead: input.consistentRead,
      }),
    });
  },
};

export default queryDataItems;
