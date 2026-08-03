import type { ActionDefinition } from "@w6w/types";
import { WixClient } from "../lib/client.ts";

interface Input {
  dataItemId: string;
  dataCollectionId: string;
  consistentRead?: boolean;
}

/**
 * `GET /wix-data/v2/items/{dataItemId}?dataCollectionId=…` — handler
 * `wix.data.v2.data_item:GetDataItem`.
 *
 * Wix documents a `POST /wix-data/v2/items/get` alias that takes the same
 * arguments in a body; both resolve to the identical handler. The GET form is
 * used here because a plain read should be a GET — it is cacheable, safe to
 * retry, and reads correctly in a workflow log.
 */
const getDataItem: ActionDefinition<Input> = {
  key: "get-data-item",
  type: "read",
  resource: "data-item",
  title: "Get Data Item",
  description: "Retrieve a single item from a CMS collection by its id.",
  params: [
    { key: "dataItemId", label: "Item ID", type: "string", required: true },
    {
      key: "dataCollectionId",
      label: "Collection ID",
      type: "string",
      required: true,
      hint: "Item ids are unique only within a collection, so this is required too.",
    },
    {
      key: "consistentRead",
      label: "Consistent read",
      type: "boolean",
      hint: "Read from the primary database so a write made moments ago is visible.",
    },
  ],
  output: [{ key: "dataItem", type: "object", label: "Data item" }],

  execute(input, ctx) {
    return new WixClient(ctx).request(
      `/wix-data/v2/items/${encodeURIComponent(input.dataItemId)}`,
      {
        query: {
          dataCollectionId: input.dataCollectionId,
          consistentRead: input.consistentRead,
        },
      },
    );
  },
};

export default getDataItem;
