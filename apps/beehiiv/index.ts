/**
 * beehiiv — publications, posts and subscriptions for the newsletter platform.
 *
 * Every path, field name, enum and error shape here comes from beehiiv's own
 * OpenAPI 3.0.1 document (`.ai/apps/docs/beehiiv - OpenAPI Specification.yaml`,
 * ~23k lines, `info.title` "Beehiiv API") plus live probes against
 * `api.beehiiv.com` on 2026-09-29. See `lib/client.ts` for the wire-level
 * details (one host, two pagination shapes, structured errors).
 *
 * ## The three resources this app covers
 *
 *   - **Publications** — the newsletter itself. Read-only here (list, get);
 *     everything else is configured in the beehiiv dashboard.
 *   - **Posts** — the emails/web pages sent to subscribers, via beehiiv's
 *     **Send API** (Max/Enterprise plans only). Creation and update are
 *     asynchronous: `post-create`/`post-update` return a stable `id`
 *     immediately, but the post may still be building — `post-get` surfaces
 *     that as a `processing` flag rather than throwing, and a background
 *     failure lands as `404 POST_CREATION_FAILED`, a permanent failure the
 *     caller must not retry.
 *   - **Subscriptions** — the subscriber list. `subscription-get-by-email` is
 *     the lookup most automations reach for first (does this address already
 *     have a subscription, and what state is it in). `subscription-list` is
 *     the one list endpoint in the whole API with cursor pagination — the
 *     vendor's own spec deprecates offset paging there past 100 pages.
 *
 * ## Deliberately left out
 *
 * The Ad Network (beta, per the vendor's own spec), bulk subscription
 * actions, automations/journeys, newsletter lists, segments, custom fields,
 * authors, polls, podcasts, premium tiers, complimentary access, condition
 * sets, data-privacy deletion requests, email blasts, engagements, subscriber
 * exports, the referral program, webhooks, post templates and publication
 * fields, and every workspace-scoped (cross-publication) endpoint. See the
 * README for why each was cut.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import publicationList from "./actions/publication-list.ts";
import publicationGet from "./actions/publication-get.ts";

import postList from "./actions/post-list.ts";
import postGet from "./actions/post-get.ts";
import postCreate from "./actions/post-create.ts";
import postUpdate from "./actions/post-update.ts";
import postDelete from "./actions/post-delete.ts";

import subscriptionList from "./actions/subscription-list.ts";
import subscriptionGet from "./actions/subscription-get.ts";
import subscriptionGetByEmail from "./actions/subscription-get-by-email.ts";
import subscriptionCreate from "./actions/subscription-create.ts";
import subscriptionUpdate from "./actions/subscription-update.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // publications — read-only
    publicationList,
    publicationGet,
    // posts — the Send API
    postList,
    postGet,
    postCreate,
    postUpdate,
    postDelete,
    // subscriptions — the subscriber list
    subscriptionList,
    subscriptionGet,
    subscriptionGetByEmail,
    subscriptionCreate,
    subscriptionUpdate,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
