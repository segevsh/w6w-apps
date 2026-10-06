import type { ActionDefinition } from "@w6w/types";
import { PrintfulClient, seg } from "../lib/client.ts";
import { syncProductIdParam } from "../lib/params.ts";

interface Input {
  syncProductId: string;
}

/** `GET /store/products/{syncProductId}` — Get one sync product with its sync variants. */
const syncProductGet: ActionDefinition<Input> = {
  key: "sync-product-get",
  type: "read",
  resource: "sync-product",
  title: "Get Sync Product",
  description: "Get one sync product with its sync variants.",
  params: [
    syncProductIdParam,
  ],
  output: [
    { key: "sync_product", type: "object", label: "Sync product" },
    { key: "sync_variants", type: "array", label: "Sync variants" },
  ],

  async execute(input, ctx) {
    const result = await new PrintfulClient(ctx).request<Record<string, unknown>>(
      "GET",
      `/store/products/${seg(input.syncProductId)}`,
    );
    return result ?? {};
  },
};

export default syncProductGet;
