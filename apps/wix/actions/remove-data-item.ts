import type { ActionDefinition } from "@w6w/types";
import { WixClient } from "../lib/client.ts";

interface Input {
  dataItemId: string;
  dataCollectionId: string;
}

/**
 * `DELETE /wix-data/v2/items/{dataItemId}?dataCollectionId=…` — handler
 * `wix.data.v2.data_item:RemoveDataItem`.
 */
const removeDataItem: ActionDefinition<Input> = {
  key: "remove-data-item",
  type: "perform",
  resource: "data-item",
  /**
   * Idempotent: the item is gone after the first call and gone after the second.
   * A repeat delete of a missing item errors rather than succeeding, but it does
   * not remove anything else, so a retry cannot cause additional damage — which
   * is what this flag governs.
   */
  idempotent: true,
  title: "Remove Data Item",
  description: "Permanently delete an item from a CMS collection.",
  params: [
    { key: "dataItemId", label: "Item ID", type: "string", required: true },
    { key: "dataCollectionId", label: "Collection ID", type: "string", required: true },
  ],
  output: [{ key: "dataItem", type: "object", label: "The removed data item" }],

  execute(input, ctx) {
    ctx.log("info", "removing data item", {
      dataCollectionId: input.dataCollectionId,
      dataItemId: input.dataItemId,
    });
    return new WixClient(ctx).request(
      `/wix-data/v2/items/${encodeURIComponent(input.dataItemId)}`,
      { method: "DELETE", query: { dataCollectionId: input.dataCollectionId } },
    );
  },
};

export default removeDataItem;
