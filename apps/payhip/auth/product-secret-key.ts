import type { AuthDefinition } from "@w6w/types";
import { licenseUrl } from "../lib/client.ts";
import { probe } from "../lib/probe.ts";

/**
 * Payhip v2 product secret key — `product-secret-key: <key>`.
 *
 * One secret per digital product (shown on the product's edit page once license keys are
 * enabled). It is designed for public apps: it can only act on that product's licenses. A
 * connection therefore covers ONE product; connect once per product.
 */
export interface ProductSecretCredential {
  productSecretKey: string;
}

const productSecretKey: AuthDefinition = {
  key: "product-secret-key",
  type: "apiKey",
  displayName: "Product Secret Key (v2)",
  description: "The per-product secret from the product's edit page (license keys section). " +
    "Scopes the connection to that one product.",
  apiKey: { in: "header", name: "product-secret-key" },
  fields: [{
    key: "productSecretKey",
    label: "Product Secret Key",
    type: "secret",
    required: true,
    hint: "Edit your product, scroll to the license keys section. Only shown after the " +
      "product has been created with license keys enabled.",
  }],

  sign({ request, credential }) {
    request.headers["product-secret-key"] = (credential as ProductSecretCredential)
      .productSecretKey;
    return request;
  },

  async test({ credential }, ctx) {
    const secret = ((credential as Partial<ProductSecretCredential>)?.productSecretKey ?? "")
      .trim();
    if (!secret) return { ok: false, message: "credential missing productSecretKey" };
    return await probe(ctx, `${licenseUrl("verify", "v2")}?license_key=w6w-connection-probe`, {
      "product-secret-key": secret,
    });
  },
};

export default productSecretKey;
