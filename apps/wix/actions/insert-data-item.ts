import type { ActionDefinition } from "@w6w/types";
import { compact, WixClient } from "../lib/client.ts";

interface Input {
  dataCollectionId: string;
  data: Record<string, unknown>;
  dataItemId?: string;
}

/** `POST /wix-data/v2/items` — handler `wix.data.v2.data_item:InsertDataItem`. */
const insertDataItem: ActionDefinition<Input> = {
  key: "insert-data-item",
  type: "perform",
  resource: "data-item",
  /**
   * Not idempotent by default: called twice with no id, Wix mints a fresh random
   * id each time and you get two rows. It *becomes* idempotent when `dataItemId`
   * is supplied — Wix rejects an insert whose id already exists — which is why
   * that field is offered and why `ctx.invocation.invocationId` is suggested as
   * its value. The flag reports the default behaviour honestly rather than the
   * best case.
   */
  idempotent: false,
  title: "Insert Data Item",
  description: "Insert a new item into a CMS collection.",
  params: [
    { key: "dataCollectionId", label: "Collection ID", type: "string", required: true },
    {
      key: "data",
      label: "Item data",
      type: "json",
      required: true,
      hint:
        "Property-value pairs matching the collection's fields. Fields starting with `_` are managed by Wix.",
    },
    {
      key: "dataItemId",
      label: "Item ID",
      type: "string",
      hint:
        "Optional explicit id. Wix rejects an id that already exists, so supplying a stable value (e.g. the run's invocation id) makes a retry safe instead of duplicating the row.",
    },
  ],
  output: [{ key: "dataItem", type: "object", label: "Inserted data item" }],

  execute(input, ctx) {
    return new WixClient(ctx).request("/wix-data/v2/items", {
      method: "POST",
      body: {
        dataCollectionId: input.dataCollectionId,
        dataItem: compact({ id: input.dataItemId, data: input.data }),
      },
    });
  },
};

export default insertDataItem;
