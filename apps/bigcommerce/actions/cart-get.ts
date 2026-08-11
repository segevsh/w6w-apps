import type { ActionDefinition } from "@w6w/types";
import { BigCommerceClient, encodeId, toList } from "../lib/client.ts";
import { cartIncludeOptions } from "../lib/params.ts";

/**
 * `GET /v3/carts/{cartId}` — one cart, by its UUID.
 *
 * **There is no list-carts endpoint**, and that is not an omission in this app.
 * Probed unauthenticated on 2026-08-11, `GET /v3/carts` answers
 * `404 The route is not found, check the URL` while `POST /v3/carts` answers
 * `401 X-Auth-Token header is required` — so the collection genuinely exists for
 * writing and does not exist for reading. A cart is reachable only if you already
 * hold its id: from the order it became, from a webhook, or from having created
 * it.
 *
 * `include=redirect_urls` is the one worth knowing: it returns the storefront
 * cart and checkout URLs for this cart, which is how a workflow hands a shopper
 * back a pre-filled basket.
 */
interface Input {
  cartId: string;
  include?: string[];
}

const cartGet: ActionDefinition<Input> = {
  key: "cart-get",
  type: "read",
  resource: "cart",
  title: "Get Cart",
  description:
    "Fetch one cart by its UUID. There is no way to list carts — you need the id already.",
  params: [
    {
      key: "cartId",
      label: "Cart ID",
      type: "string",
      required: true,
      placeholder: "00000000-0000-0000-0000-000000000000",
      hint: "The cart's UUID.",
    },
    {
      key: "include",
      label: "Include",
      type: "multiselect",
      options: cartIncludeOptions,
      hint: "`redirect_urls` returns the storefront cart and checkout links for this cart.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Cart ID" },
    { key: "customer_id", type: "number", label: "Customer ID" },
    { key: "cart_amount", type: "number", label: "Cart amount" },
    { key: "line_items", type: "object", label: "Line items" },
  ],

  execute(input, ctx) {
    return new BigCommerceClient(ctx).v3(`/carts/${encodeId(input.cartId)}`, {
      query: { include: toList(input.include) },
    });
  },
};

export default cartGet;
