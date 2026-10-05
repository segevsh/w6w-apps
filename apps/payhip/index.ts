/**
 * Payhip — software license keys, over Payhip's public license API (`payhip.com/api`).
 *
 * Scope, stated plainly: Payhip's public API covers **software license keys only**. There is
 * no documented API for products, orders, customers, coupons or payouts, so none is wrapped.
 * (Documentation: help.payhip.com articles 317 "Software License Keys" and 114 "Legacy";
 * `payhip.com/api` itself is a seller storefront, not docs.)
 *
 * Findings that shaped the design:
 *
 *  1. **Verify does not consume a use.** Counting is a separate call (`usage`/`decrease`), so
 *     the verify action is a safe read, unlike APIs where verify increments by default.
 *  2. **Failure is an empty response.** Unknown key, wrong secret and refused update all return
 *     no body; verify maps it to `found: false`, the mutations throw.
 *  3. **Two generations on one host.** v2 (current) authenticates with a per-product
 *     `product-secret-key`; legacy v1 with an account `payhip-api-key` plus `product_link`.
 *     Each action takes an `apiVersion` (default v2) matching the connection's auth method.
 */
import type { AppDefinition } from "@w6w/types";
import productSecretKey from "./auth/product-secret-key.ts";
import apiKey from "./auth/api-key.ts";

import licenseVerify from "./actions/license-verify.ts";
import licenseEnable from "./actions/license-enable.ts";
import licenseDisable from "./actions/license-disable.ts";
import licenseUsageIncrease from "./actions/license-usage-increase.ts";
import licenseUsageDecrease from "./actions/license-usage-decrease.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    licenseVerify,
    licenseEnable,
    licenseDisable,
    licenseUsageIncrease,
    licenseUsageDecrease,
  ],
  auth: [productSecretKey, apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
