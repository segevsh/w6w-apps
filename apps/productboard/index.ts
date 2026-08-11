/**
 * Productboard — the product management platform: read and write the product
 * hierarchy (products, components, features, initiatives, objectives, key
 * results, releases), push and triage customer feedback notes, inspect teams and
 * members, and manage webhook subscriptions, over the Productboard **REST API
 * v2** (`api.productboard.com/v2`).
 *
 * Every path, verb, query parameter, body field and enum in this app was
 * verified on 2026-08-11 against Productboard's own OpenAPI documents — the
 * nine files published at `developer.productboard.com/v2/openapi`, all
 * `openapi: 3.1.1`, `info.version: 2.0.0` — plus the prose reference at
 * `developer.productboard.com` and live probes against `api.productboard.com`
 * and `status.productboard.com`. Nothing here came from a third-party
 * integration directory.
 *
 * The five findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **v1 is entirely deprecated, and v2 takes no `X-Version` header**
 *     (`lib/client.ts`). All **119** operations in v1's OpenAPI document carry
 *     `deprecated: true`; none of v2's **59** do. v1 requires
 *     `X-Version: 1` (`enum: [1]` — one legal value); v2 requires no version
 *     header at all, which the vendor's migration guide states under the
 *     heading "No X-Version header required" and which zero occurrences of the
 *     string across all nine v2 documents confirms. This app is v2-only and
 *     never sends that header.
 *  2. **Four distinct auth failures share one status code and two body shapes**
 *     (`auth/api-token.ts`). Missing token, empty token, non-JWT token and
 *     unknown-issuer JWT are all **401**, distinguishable only by body — and
 *     the body is the gateway's `{"message": …}`, not the `{"errors": […]}`
 *     shape the OpenAPI documents define for 401. The client parses both; the
 *     `test` hook classifies from the body, never the status.
 *  3. **`HEAD` is not routed** (`lib/client.ts`, `health/api.ts`). `GET
 *     /v2/entities` answers 401 while `HEAD` on the same URL answers 404
 *     `route.notFound`. The obvious body-less reachability probe reports a
 *     healthy API as a dead route; every request here is a real `GET`.
 *  4. **Deletes cascade, silently, and that is new in v2**
 *     (`actions/entity-delete.ts`). Deleting a feature deletes its subfeatures;
 *     deleting a release group deletes its releases. v1 refused; v2 does not
 *     warn. That action ships the vendor's own suggested workaround — a
 *     children check — switched on by default.
 *  5. **The API is configuration-driven, so field names are workspace data**
 *     (`actions/entity-configuration-*.ts`, `actions/note-configuration-list.ts`).
 *     Custom fields appear as bare UUID keys. An integration that hard-codes
 *     field names is guessing; the `/configurations` endpoints are how to stop.
 *
 * Two vocabulary traps worth carrying in your head: a note's product link uses
 * the literal target type `"link"` (not `"feature"`), and a webhook's `events`
 * is an array of `{eventType}` objects (not of strings).
 */
import type { AppDefinition } from "@w6w/types";
import apiToken from "./auth/api-token.ts";

// Entities — the unified product-hierarchy surface
import entityConfigurationList from "./actions/entity-configuration-list.ts";
import entityConfigurationGet from "./actions/entity-configuration-get.ts";
import entityList from "./actions/entity-list.ts";
import entityGet from "./actions/entity-get.ts";
import entityCreate from "./actions/entity-create.ts";
import entityUpdate from "./actions/entity-update.ts";
import entityDelete from "./actions/entity-delete.ts";
import entitySearch from "./actions/entity-search.ts";
import entityFieldValueList from "./actions/entity-field-value-list.ts";
import entityScoreGet from "./actions/entity-score-get.ts";
import entityRelationshipList from "./actions/entity-relationship-list.ts";
import entityRelationshipCreate from "./actions/entity-relationship-create.ts";
import entityParentSet from "./actions/entity-parent-set.ts";
import entityRelationshipDelete from "./actions/entity-relationship-delete.ts";

// Notes — customer feedback
import noteConfigurationList from "./actions/note-configuration-list.ts";
import noteList from "./actions/note-list.ts";
import noteGet from "./actions/note-get.ts";
import noteCreate from "./actions/note-create.ts";
import noteUpdate from "./actions/note-update.ts";
import noteDelete from "./actions/note-delete.ts";
import noteSearch from "./actions/note-search.ts";
import noteCommentCreate from "./actions/note-comment-create.ts";
import noteRelationshipList from "./actions/note-relationship-list.ts";
import noteRelationshipCreate from "./actions/note-relationship-create.ts";
import noteRelationshipDelete from "./actions/note-relationship-delete.ts";

// Members and teams
import memberList from "./actions/member-list.ts";
import memberGet from "./actions/member-get.ts";
import memberSearch from "./actions/member-search.ts";
import teamList from "./actions/team-list.ts";
import teamGet from "./actions/team-get.ts";
import teamSearch from "./actions/team-search.ts";
import teamMemberList from "./actions/team-member-list.ts";

// Webhooks
import webhookList from "./actions/webhook-list.ts";
import webhookGet from "./actions/webhook-get.ts";
import webhookCreate from "./actions/webhook-create.ts";
import webhookDelete from "./actions/webhook-delete.ts";

// Analytics and integrations
import memberActivityList from "./actions/member-activity-list.ts";
import jiraIntegrationList from "./actions/jira-integration-list.ts";
import jiraIntegrationConnectionList from "./actions/jira-integration-connection-list.ts";
import pluginIntegrationList from "./actions/plugin-integration-list.ts";
import pluginIntegrationConnectionList from "./actions/plugin-integration-connection-list.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Entities
    entityConfigurationList,
    entityConfigurationGet,
    entityList,
    entityGet,
    entityCreate,
    entityUpdate,
    entityDelete,
    entitySearch,
    entityFieldValueList,
    entityScoreGet,
    entityRelationshipList,
    entityRelationshipCreate,
    entityParentSet,
    entityRelationshipDelete,
    // Notes
    noteConfigurationList,
    noteList,
    noteGet,
    noteCreate,
    noteUpdate,
    noteDelete,
    noteSearch,
    noteCommentCreate,
    noteRelationshipList,
    noteRelationshipCreate,
    noteRelationshipDelete,
    // Members and teams
    memberList,
    memberGet,
    memberSearch,
    teamList,
    teamGet,
    teamSearch,
    teamMemberList,
    // Webhooks
    webhookList,
    webhookGet,
    webhookCreate,
    webhookDelete,
    // Analytics and integrations
    memberActivityList,
    jiraIntegrationList,
    jiraIntegrationConnectionList,
    pluginIntegrationList,
    pluginIntegrationConnectionList,
  ],
  // One auth method. Productboard documents four flows — personal API token,
  // OAuth 2.0 authorization code, OAuth server-to-server JWT, and OAuth for MCP
  // clients — but all four end in the same `Authorization: Bearer` header, and
  // the OAuth2 scope vocabulary in the v2 documents is self-contradictory
  // (three scopes declared, sixteen required by operations, and two spellings of
  // the write scope). See `auth/api-token.ts` for the measurement.
  auth: [apiToken],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
