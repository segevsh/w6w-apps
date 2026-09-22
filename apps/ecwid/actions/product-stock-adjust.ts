import type { ActionDefinition } from "@w6w/types";
import { EcwidClient, encodeId } from "../lib/client.ts";
import { productIdParam } from "../lib/params.ts";

/**
 * `PUT /products/{productId}/inventory` — move stock by a delta.
 *
 * The body is `{"quantityDelta": <number>}`: positive adds, negative subtracts
 * ("For example, `5` adds 5 to the product stock, and `-10` decreases it for
 * 10"). This is the only documented way to change stock without sending the
 * product's absolute quantity, which is what makes it safe for a workflow that
 * reacts to an external event — an absolute `PUT` would clobber concurrent sales
 * between the read and the write.
 *
 * **Not idempotent, on purpose.** The same call applied twice moves stock twice;
 * there is no idempotency key on this endpoint, so the runtime must not retry it
 * silently. That is exactly why this is a separate action from
 * `product-update`, whose `quantity` field sets an absolute value.
 *
 * The response is `{"updateCount": 1}` and may carry a `warning` when the
 * resulting stock went negative — surfaced rather than swallowed, because a
 * negative stock is usually a mistake worth seeing in the run log.
 *
 * Variations are not covered: this endpoint moves the base product's stock, and
 * a variation's stock is addressed through its own combination id.
 */
interface Input {
  productId: string;
  quantityDelta: number;
  checkLowStockNotification?: boolean;
}

const productStockAdjust: ActionDefinition<Input> = {
  key: "product-stock-adjust",
  type: "perform",
  resource: "product",
  title: "Adjust Product Stock",
  description:
    "Add to or subtract from a product's stock on hand by a delta — the safe way to reflect a " +
    "sale or a return without overwriting concurrent changes.",
  idempotent: false,
  params: [
    productIdParam,
    {
      key: "quantityDelta",
      label: "Quantity delta",
      type: "number",
      required: true,
      hint: "Positive increases stock, negative decreases it. `-1` sells one unit; `0` is a no-op.",
    },
    {
      key: "checkLowStockNotification",
      label: "Low stock notification",
      type: "boolean",
      advanced: true,
      hint:
        "Whether Ecwid should evaluate the product's warning limit and email the store owner. " +
        "Left unset, Ecwid applies its own store setting.",
    },
  ],
  output: [
    { key: "updateCount", type: "number", label: "1 when the stock was updated" },
    {
      key: "warning",
      type: "string",
      label: "Present when the stock became negative after the adjustment",
    },
  ],

  execute(input, ctx) {
    return new EcwidClient(ctx).json(`/products/${encodeId(input.productId)}/inventory`, {
      method: "PUT",
      query: { checkLowStockNotification: input.checkLowStockNotification },
      body: { quantityDelta: input.quantityDelta },
    });
  },
};

export default productStockAdjust;
