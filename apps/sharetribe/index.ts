/**
 * Sharetribe — the marketplace-as-a-service platform. This app covers the **Integration API**
 * (`flex-integ-api.sharetribe.com`), Sharetribe's trusted server-side surface with full
 * read/write access to marketplace data, plus the separate, read-only, unauthenticated
 * **Asset Delivery API** (`cdn.st-api.com`).
 *
 * Every path, method, body/query field and error code in this app was verified on 2026-09-29
 * against Sharetribe's own hand-written API reference
 * (`sharetribe.com/api-reference/{index,integration,authentication,asset-delivery-api}.html` —
 * there is no machine-readable OpenAPI document, the same class of docs-only vendor as this
 * pack's `cloudconvert` app) plus live probes against `flex-integ-api.sharetribe.com`,
 * `flex-api.sharetribe.com` and `cdn.st-api.com`. Nothing here came from a third-party
 * integration directory.
 *
 * ## Why not the Marketplace API
 *
 * Sharetribe's reference documents a second surface, the Marketplace API — what a marketplace's
 * own end-user client authenticates against, either as one logged-in marketplace user (their own
 * email+password) or anonymously. Neither shape fits a workflow-host Connection: the first would
 * mean storing a marketplace shopper's own password, and the second grants only public-read,
 * anonymous access. The Integration API's `client_id`+`client_secret` machine credential is the
 * shape this app models; see `auth/integration-app.ts`.
 *
 * ## Neither covered surface is per-tenant
 *
 * Both `flex-integ-api.sharetribe.com` and `flex-api.sharetribe.com` (used only to mint the
 * access token — see `lib/client.ts`) are **fixed hosts shared by every Sharetribe marketplace**;
 * a marketplace is identified by which credential pair authenticates, not by subdomain or path.
 * So, unlike an app that has to fall back to a `*.vendor.com` wildcard for a per-tenant host,
 * every entry in `w6w.network.allow` here is an exact hostname.
 *
 * ## Two findings that shaped the design
 *
 *  1. **Command (`POST`) endpoints return only a bare resource reference by default** — no
 *     `attributes` — unless `?expand=true` is sent. `lib/client.ts`'s `SharetribeClient.command`
 *     sends it on every call, so a workflow step has something to chain on.
 *  2. **The response envelope is JSON:API-flavoured** (`{id, type, attributes, relationships?}`),
 *     not flattened — mirroring this pack's `kustomer` app, the other JSON:API-shaped vendor,
 *     rather than Apify/CloudConvert's already-flat resources.
 *
 * ## Deliberately not covered
 *
 * - **`users/update_profile`/`update_permissions`/`verify_email`/`approve`**,
 *   **`availability_exceptions/*`**, **`images/upload`**, **`messages/query`**,
 *   **`files/*`/`file_attachments/*`/`file_downloads/create`**, and **`stock_adjustments/*`** —
 *   real, documented endpoints this app's first pass did not reach; none was left out because it
 *   could not be confirmed.
 * - **Marketplace API and OAuth2 authorization-code flows** — see "Why not the Marketplace API"
 *   above.
 * - **`listings/create`'s `availabilityPlan`/`protectedFileAttachments`** — see
 *   `actions/listing-create.ts`.
 */
import type { AppDefinition } from "@w6w/types";
import integrationApp from "./auth/integration-app.ts";

import marketplaceGet from "./actions/marketplace-get.ts";

import userGet from "./actions/user-get.ts";
import userList from "./actions/user-list.ts";

import listingGet from "./actions/listing-get.ts";
import listingList from "./actions/listing-list.ts";
import listingCreate from "./actions/listing-create.ts";
import listingUpdate from "./actions/listing-update.ts";
import listingClose from "./actions/listing-close.ts";
import listingOpen from "./actions/listing-open.ts";
import listingApprove from "./actions/listing-approve.ts";

import transactionGet from "./actions/transaction-get.ts";
import transactionList from "./actions/transaction-list.ts";
import transactionTransition from "./actions/transaction-transition.ts";
import transactionTransitionSpeculative from "./actions/transaction-transition-speculative.ts";
import transactionUpdateMetadata from "./actions/transaction-update-metadata.ts";

import stockSet from "./actions/stock-set.ts";
import eventList from "./actions/event-list.ts";

import assetGet from "./actions/asset-get.ts";
import assetList from "./actions/asset-list.ts";

import service from "./health/service.ts";
import requestRate from "./health/request-rate.ts";

export default {
  actions: [
    marketplaceGet,
    // Users
    userGet,
    userList,
    // Listings
    listingGet,
    listingList,
    listingCreate,
    listingUpdate,
    listingClose,
    listingOpen,
    listingApprove,
    // Transactions
    transactionGet,
    transactionList,
    transactionTransition,
    transactionTransitionSpeculative,
    transactionUpdateMetadata,
    // Stock
    stockSet,
    // Events
    eventList,
    // Asset Delivery API (no auth)
    assetGet,
    assetList,
  ],
  auth: [integrationApp],
  healthChecks: [service, requestRate],
} satisfies AppDefinition;
