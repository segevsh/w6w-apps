/**
 * Tremendous — the payouts and incentives API: gift cards, prepaid cards,
 * cash and donations, sent via `api.tremendous.com`.
 *
 * Every path, verb, query parameter, body field and enum in this app was
 * verified on 2026-09-15 against Tremendous's own per-endpoint OpenAPI 3.0
 * definitions (served at `developers.tremendous.com/reference/<slug>.md`,
 * each embedding the same `BearerApiKey` security scheme and `servers`
 * array), the prose guides under `developers.tremendous.com/docs/*`, and
 * live probes against `api.tremendous.com`, `testflight.tremendous.com` and
 * `status.tremendous.com`. Nothing here came from a third-party integration
 * directory.
 *
 * The findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **Idempotency is a body field, not a header** (`actions/order-create.ts`,
 *     `lib/client.ts`). `POST /orders` takes `external_id`; the SAME value
 *     replays the original order with a `201` (not `200`), and a DIFFERENT
 *     payload under the same `external_id` is refused with `409`. Skipping
 *     it makes a retried send a second, real payout — this app derives one
 *     automatically from the invocation id when the caller doesn't supply
 *     one.
 *  2. **Only single-reward orders are documented.** `create-order`'s
 *     `requestBody` is a `oneOf` with exactly one member, `SingleRewardOrder`
 *     — multi-product orders are marked work-in-progress in Tremendous's own
 *     guides, so this app sends single-reward orders only.
 *  3. **Two live hosts, not a path prefix** (`lib/client.ts`). Sandbox
 *     (`testflight.tremendous.com`, `TEST_` keys) and production
 *     (`api.tremendous.com`, `PROD_` keys) are separate hosts with separate
 *     data. This app only ever calls production.
 *  4. **The credential probe is `GET /organizations`, not a guessed whoami**
 *     (`auth/api-key.ts`) — it is the authentication guide's own worked
 *     example, returns no credential material, and needs no scope a
 *     restricted key could lack.
 *  5. **The real status page is NOT Statuspage** (`health/service.ts`).
 *     `tremendous.statuspage.io` redirects to `/inactive`; the genuine,
 *     actively-updated page is a custom platform at `status.tremendous.com`.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import orderCreate from "./actions/order-create.ts";
import orderGet from "./actions/order-get.ts";
import orderList from "./actions/order-list.ts";

import rewardGet from "./actions/reward-get.ts";
import rewardList from "./actions/reward-list.ts";
import rewardCancel from "./actions/reward-cancel.ts";
import rewardResend from "./actions/reward-resend.ts";
import rewardGenerateLink from "./actions/reward-generate-link.ts";

import productList from "./actions/product-list.ts";
import productGet from "./actions/product-get.ts";

import campaignList from "./actions/campaign-list.ts";
import campaignGet from "./actions/campaign-get.ts";

import fundingSourceList from "./actions/funding-source-list.ts";
import fundingSourceGet from "./actions/funding-source-get.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";
import requestRate from "./health/request-rate.ts";

export default {
  actions: [
    // Orders
    orderCreate,
    orderGet,
    orderList,
    // Rewards
    rewardGet,
    rewardList,
    rewardCancel,
    rewardResend,
    rewardGenerateLink,
    // Products
    productList,
    productGet,
    // Campaigns
    campaignList,
    campaignGet,
    // Funding sources
    fundingSourceList,
    fundingSourceGet,
  ],
  // API key only. Tremendous also documents OAuth 2.0 for multi-account platform
  // apps, but that requires a partner registration this app doesn't have; see the README.
  auth: [apiKey],
  healthChecks: [service, quota, requestRate],
} satisfies AppDefinition;
