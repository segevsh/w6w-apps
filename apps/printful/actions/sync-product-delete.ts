import type { ActionDefinition } from "@w6w/types";
import { PrintfulClient, seg } from "../lib/client.ts";
import { syncProductIdParam } from "../lib/params.ts";

interface Input {
  syncProductId: string;
}

/** `DELETE /store/products/{syncProductId}` — Delete a sync product and all of its sync variants. */
const syncProductDelete: ActionDefinition<Input> = {
  key: "sync-product-delete",
  type: "perform",
  resource: "sync-product",
  title: "Delete Sync Product",
  description:
    "Delete a sync product and all of its sync variants. Orders already placed are unaffected.",
  idempotent: true,
  params: [
    syncProductIdParam,
  ],
  output: [
    { key: "id", type: "number", label: "Deleted sync product ID" },
  ],

  async execute(input, ctx) {
    const result = await new PrintfulClient(ctx).request<Record<string, unknown>>(
      "DELETE",
      `/store/products/${seg(input.syncProductId)}`,
    );
    return result ?? {};
  },
};

export default syncProductDelete;
