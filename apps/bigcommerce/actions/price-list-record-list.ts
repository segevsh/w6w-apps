import type { ActionDefinition } from "@w6w/types";
import { BigCommerceClient, type BigCommercePage, encodeId, toList } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

/**
 * `GET /v3/pricelists/{price_list_id}/records` — the prices in one price list.
 *
 * A record is keyed by **variant and currency**, not by product: the same variant
 * appears once per currency the list prices it in. That is why `currency` is a
 * first-class filter here and why a caller that ignores it sees apparent
 * duplicates.
 *
 * This is one of only two endpoints in the app's surface that documents a `429`
 * response of its own, which is a hint that the vendor expects it to be walked
 * hard. Page it gently.
 */
interface Input {
  priceListId: number;
  variantIds?: string;
  productIds?: string;
  skus?: string;
  currency?: string;
  limit?: number;
  page?: number;
}

const priceListRecordList: ActionDefinition<Input, BigCommercePage<unknown>> = {
  key: "price-list-record-list",
  type: "search",
  resource: "price-list",
  title: "List Price List Records",
  description: "The per-variant, per-currency prices inside one price list.",
  params: [
    {
      key: "priceListId",
      label: "Price list ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
    },
    {
      key: "variantIds",
      label: "Variant IDs",
      type: "string",
      hint: "Comma-separated. Sent as `variant_id:in`.",
    },
    {
      key: "productIds",
      label: "Product IDs",
      type: "string",
      hint: "Comma-separated. Sent as `product_id:in`.",
    },
    { key: "skus", label: "SKUs", type: "string", hint: "Comma-separated. Sent as `sku:in`." },
    {
      key: "currency",
      label: "Currency",
      type: "string",
      placeholder: "usd",
      hint: "ISO 4217. Records are keyed by variant AND currency, so without this you will see " +
        "one row per currency.",
    },
    ...paginationParams(),
  ],
  output: [
    { key: "data", type: "array", label: "Price records" },
    { key: "pagination", type: "object", label: "Pagination" },
  ],

  execute(input, ctx) {
    return new BigCommerceClient(ctx).v3Page(
      `/pricelists/${encodeId(input.priceListId)}/records`,
      {
        query: {
          "variant_id:in": toList(input.variantIds),
          "product_id:in": toList(input.productIds),
          "sku:in": toList(input.skus),
          currency: input.currency,
          limit: input.limit,
          page: input.page,
        },
      },
    );
  },
};

export default priceListRecordList;
