import type { ActionDefinition } from "@w6w/types";
import { ParticleClient } from "../lib/client.ts";

/**
 * `GET /v1/products` — the products this token can reach.
 *
 * ## A product is a fleet, and it owns its devices
 *
 * The distinction that matters: a device claimed to an *account* belongs to a
 * person, and a device in a *product* belongs to the product. Product devices
 * are managed together — firmware is released to the fleet, not flashed device
 * by device — and a personal token cannot reach them.
 *
 * That is why `device-list` takes a product: the two are different lists, and
 * an automation pointed at the wrong one sees nothing and reports no error.
 *
 * ## `platform_id` fixes what firmware can run
 *
 * A product is tied to one hardware platform. Firmware built for a Boron does
 * not run on a Photon, and the product is where that constraint lives.
 */
const action: ActionDefinition = {
  key: "product-list",
  type: "read",
  resource: "product",
  title: "List products",
  description:
    "The products this token can reach. A product OWNS its devices — they are a different list " +
    "from an account's claimed devices, and an automation pointed at the wrong one sees nothing " +
    "and reports no error.",
  params: [],
  output: [
    { key: "products", type: "array", label: "The products" },
    { key: "count", type: "number", label: "How many" },
    { key: "ids", type: "array", label: "Just the product ids" },
    { key: "slugs", type: "array", label: "Their slugs, which also work in paths" },
    { key: "platforms", type: "array", label: "The distinct hardware platforms" },
  ],

  async execute(_input, ctx) {
    const response = await new ParticleClient(ctx).request<{
      products?: Array<{ id?: number; slug?: string; name?: string; platform_id?: number }>;
    }>("/v1/products");

    const products = response?.products ?? [];

    return {
      products,
      count: products.length,
      ids: products.map((product) => product?.id).filter((id) => id !== undefined),
      slugs: products.map((product) => product?.slug).filter(Boolean),
      // A product is tied to one platform, and firmware is platform-specific.
      platforms: [
        ...new Set(
          products.map((product) => product?.platform_id).filter((id) => id !== undefined),
        ),
      ].sort(),
    };
  },
};

export default action;
