import type { ActionDefinition } from "@w6w/types";
import { WixClient } from "../lib/client.ts";

interface Input {
  dataCollectionId: string;
  dataItemId: string;
  data: Record<string, unknown>;
}

/** `PUT /wix-data/v2/items/{dataItem.id}` — handler `wix.data.v2.data_item:UpdateDataItem`. */
const updateDataItem: ActionDefinition<Input> = {
  key: "update-data-item",
  type: "perform",
  resource: "data-item",
  /**
   * Idempotent: a PUT replaces the item's contents with exactly what is sent, so
   * running it twice leaves the same row in the same state.
   *
   * Note it *replaces* rather than merges — a field omitted from `data` is
   * cleared, not left alone. Read the item first if you mean to change one field.
   */
  idempotent: true,
  title: "Update Data Item",
  description:
    "Replace a CMS item's contents. This is a full replace, not a merge — omitted fields are cleared.",
  params: [
    { key: "dataCollectionId", label: "Collection ID", type: "string", required: true },
    { key: "dataItemId", label: "Item ID", type: "string", required: true },
    {
      key: "data",
      label: "Item data",
      type: "json",
      required: true,
      hint: "The item's complete contents. Any field you leave out is cleared.",
    },
  ],
  output: [{ key: "dataItem", type: "object", label: "Updated data item" }],

  execute(input, ctx) {
    return new WixClient(ctx).request(
      `/wix-data/v2/items/${encodeURIComponent(input.dataItemId)}`,
      {
        method: "PUT",
        body: {
          dataCollectionId: input.dataCollectionId,
          dataItem: { id: input.dataItemId, data: input.data },
        },
      },
    );
  },
};

export default updateDataItem;
