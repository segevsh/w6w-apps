import type { ActionDefinition } from "@w6w/types";
import { GumroadClient } from "../lib/client.ts";

/**
 * `POST /v2/licenses/verify`
 */
interface Input {
  productId: string;
  licenseKey: string;
  incrementUsesCount?: boolean;
}

const licenseVerify: ActionDefinition<Input> = {
  key: "license-verify",
  type: "perform",
  resource: "license",
  title: "Verify License",
  description:
    "Check a license key. Gumroad's own default INCREMENTS the key's use counter on every call; this action defaults Increment uses count to false so a check has no side effect.",
  idempotent: false,
  params: [
    {
      "key": "productId",
      "label": "Product ID",
      "type": "string",
      "required": true,
      "hint":
        "The product's `id` (from List Products, e.g. `A-m3CDDC5dlrSdKZp0RFhA==`), not its permalink.",
    },
    { "key": "licenseKey", "label": "License key", "type": "string", "required": true },
    {
      "key": "incrementUsesCount",
      "label": "Increment uses count",
      "type": "boolean",
      "default": false,
      "hint": "True counts this call as a use of the license. Gumroad's own default is true.",
    },
  ],
  output: [{ "key": "uses", "type": "number", "label": "Use count" }, {
    "key": "purchase",
    "type": "object",
    "label": "The purchase the key belongs to",
  }],

  async execute(input, ctx) {
    const body = await new GumroadClient(ctx).call("POST", `/licenses/verify`, {
      form: {
        product_id: input.productId,
        license_key: input.licenseKey,
        increment_uses_count: input.incrementUsesCount ?? false,
      },
    });
    const { success: _success, ...rest } = body;
    return rest;
  },
};

export default licenseVerify;
