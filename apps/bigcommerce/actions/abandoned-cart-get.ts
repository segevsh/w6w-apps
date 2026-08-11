import type { ActionDefinition } from "@w6w/types";
import { BigCommerceClient, encodeId } from "../lib/client.ts";

/**
 * `GET /v3/abandoned-carts/{token}` — one abandoned cart, by its token.
 *
 * The token is **not** a cart id: it is the value in the `?t=` parameter of the
 * abandoned-cart recovery link the store emails a shopper. That is the only way
 * into this resource — the Abandoned Carts document contains exactly three
 * paths, this one plus two settings endpoints, and none of them lists carts.
 *
 * This operation is unusual in declaring `502`, `503` and `504` as documented
 * responses alongside the ordinary ones, which is a hint from the vendor that it
 * is a slower, more failure-prone read than the rest of the API. Treat a 5xx here
 * as retryable rather than as a missing cart.
 */
interface Input {
  token: string;
}

const abandonedCartGet: ActionDefinition<Input> = {
  key: "abandoned-cart-get",
  type: "read",
  resource: "cart",
  title: "Get Abandoned Cart",
  description: "Fetch an abandoned cart by the token from its recovery link.",
  params: [
    {
      key: "token",
      label: "Abandoned cart token",
      type: "string",
      required: true,
      hint: "The `t` parameter of the abandoned-cart recovery URL. Not the cart's UUID.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Cart ID" },
    { key: "customer_id", type: "number", label: "Customer ID" },
    { key: "line_items", type: "object", label: "Line items" },
  ],

  execute(input, ctx) {
    return new BigCommerceClient(ctx).v3(`/abandoned-carts/${encodeId(input.token)}`);
  },
};

export default abandonedCartGet;
