import type { ActionDefinition } from "@w6w/types";
import { GumroadClient } from "../lib/client.ts";

/**
 * `PUT /v2/licenses/enable`
 * Needs the `edit_sales` or `account` scope.
 */
interface Input {
  productId: string;
  licenseKey: string;
}

const licenseEnable: ActionDefinition<Input> = {
  key: "license-enable",
  type: "perform",
  resource: "license",
  title: "Enable License",
  description: "Re-enable a disabled license key. Needs the `edit_sales` or `account` scope.",
  idempotent: true,
  params: [{
    "key": "productId",
    "label": "Product ID",
    "type": "string",
    "required": true,
    "hint":
      "The product's `id` (from List Products, e.g. `A-m3CDDC5dlrSdKZp0RFhA==`), not its permalink.",
  }, { "key": "licenseKey", "label": "License key", "type": "string", "required": true }],
  output: [{ "key": "uses", "type": "number", "label": "Use count" }, {
    "key": "purchase",
    "type": "object",
    "label": "The purchase the key belongs to",
  }],

  async execute(input, ctx) {
    const body = await new GumroadClient(ctx).call("PUT", `/licenses/enable`, {
      form: { product_id: input.productId, license_key: input.licenseKey },
    });
    const { success: _success, ...rest } = body;
    return rest;
  },
};

export default licenseEnable;
