import type { ActionDefinition } from "@w6w/types";
import { compact, WixClient } from "../lib/client.ts";

interface Input {
  dataCollectionId: string;
  dataItems: Array<Record<string, unknown>>;
  returnEntity?: boolean;
}

/** `POST /wix-data/v2/bulk/items/insert` — handler `wix.data.v2.data_item:BulkInsertDataItems`. */
const bulkInsertDataItems: ActionDefinition<Input> = {
  key: "bulk-insert-data-items",
  type: "perform",
  resource: "data-item",
  /**
   * Not idempotent, for the same reason as the single insert: without explicit
   * ids Wix mints new ones per call, so a retry duplicates every row. Wix reports
   * per-item success in the response rather than failing the whole batch, so a
   * naive retry after a partial failure re-inserts the rows that already
   * succeeded — give each item its own `_id` if you need retry safety.
   */
  idempotent: false,
  title: "Bulk Insert Data Items",
  description:
    "Insert many items into a CMS collection in one call. Wix reports per-item results, so a partial failure is normal — read `results` rather than assuming all-or-nothing.",
  params: [
    { key: "dataCollectionId", label: "Collection ID", type: "string", required: true },
    {
      key: "dataItems",
      label: "Items",
      type: "json",
      required: true,
      hint:
        "Array of objects, each the `data` payload for one item. Include an `_id` per item to make a retry safe.",
    },
    {
      key: "returnEntity",
      label: "Return inserted items",
      type: "boolean",
      hint: "Include the full inserted items in the response rather than just their ids.",
    },
  ],
  output: [
    { key: "results", type: "array", label: "Per-item results" },
    { key: "bulkActionMetadata", type: "object", label: "Success and failure counts" },
  ],

  execute(input, ctx) {
    ctx.log("info", "bulk inserting data items", {
      dataCollectionId: input.dataCollectionId,
      count: input.dataItems.length,
    });
    return new WixClient(ctx).request("/wix-data/v2/bulk/items/insert", {
      method: "POST",
      body: compact({
        dataCollectionId: input.dataCollectionId,
        dataItems: input.dataItems.map((data) => ({ data })),
        returnEntity: input.returnEntity,
      }),
    });
  },
};

export default bulkInsertDataItems;
