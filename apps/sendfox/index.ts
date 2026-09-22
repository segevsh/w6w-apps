/**
 * SendFox — the email-newsletter tool for content creators: manage contacts,
 * their tags and list memberships, build and send campaigns, and size an
 * audience before acting on it, over the SendFox REST API
 * (`api.sendfox.com`).
 *
 * Every path, verb, query parameter, body field and enum in this app was
 * verified on 2026-09-22 against SendFox's own OpenAPI document
 * (`https://sendfox.com/openapi.yaml`, fetched live that day: HTTP 200,
 * `text/yaml`, 92,206 bytes, `info.title` "SendFox API", `info.version` 1.4.0),
 * plus live unauthenticated probes of `api.sendfox.com`. Nothing here came from
 * a third-party integration directory.
 *
 * The findings that shaped the design, each documented in full where it matters:
 *
 *  1. **The auth model is a Personal Access Token, not the declared OAuth flow**
 *     (`auth/personal-access-token.ts`). The spec declares one `oauth2`
 *     securityScheme, but its own `info.description` says API clients create a
 *     token at `sendfox.com/account/oauth` and send
 *     `Authorization: Bearer {TOKEN}`. The manifest therefore declares one
 *     `bearer` method and never touches the authorization-code dance.
 *  2. **A 401 cannot say whether a credential was missing or wrong**
 *     (`auth/personal-access-token.ts`). Measured live 2026-09-22: no header and
 *     a fake bearer both answer the byte-identical
 *     `401 {"message":"Unauthenticated."}`. `test` reports both possibilities
 *     rather than pretending to distinguish them.
 *  3. **Two response envelopes, and one count-only special** (`lib/client.ts`).
 *     Collections answer a Laravel paginator, single-resource reads answer the
 *     bare entity, and `GET /contacts?count_only=true` answers `{count, filter}`.
 *  4. **`lists` on a contact update REPLACES memberships** (`actions/contact-update.ts`).
 *     The document says so outright, which makes the action a set operation and
 *     not an add.
 *  5. **No status page exists** (`health/service.ts`). Declared as a positive
 *     fact at `informational` severity; quota is read live from the
 *     `X-RateLimit-*` headers instead.
 */
import type { AppDefinition } from "@w6w/types";
import personalAccessToken from "./auth/personal-access-token.ts";

import contactList from "./actions/contact-list.ts";
import contactGet from "./actions/contact-get.ts";
import contactCreate from "./actions/contact-create.ts";
import contactUpdate from "./actions/contact-update.ts";
import contactDelete from "./actions/contact-delete.ts";
import contactActivityGet from "./actions/contact-activity-get.ts";
import contactUnsubscribe from "./actions/contact-unsubscribe.ts";

import contactTagList from "./actions/contact-tag-list.ts";
import contactTagCreate from "./actions/contact-tag-create.ts";
import contactTagAdd from "./actions/contact-tag-add.ts";
import contactTagRemove from "./actions/contact-tag-remove.ts";

import campaignList from "./actions/campaign-list.ts";
import campaignGet from "./actions/campaign-get.ts";
import campaignCreate from "./actions/campaign-create.ts";
import campaignSend from "./actions/campaign-send.ts";
import campaignStatsGet from "./actions/campaign-stats-get.ts";

import listList from "./actions/list-list.ts";
import listCreate from "./actions/list-create.ts";
import listContactsAdd from "./actions/list-contacts-add.ts";

import formList from "./actions/form-list.ts";
import formCreate from "./actions/form-create.ts";

import automationList from "./actions/automation-list.ts";

import meGet from "./actions/me-get.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Contacts
    contactList,
    contactGet,
    contactCreate,
    contactUpdate,
    contactDelete,
    contactActivityGet,
    contactUnsubscribe,
    // Contact tags
    contactTagList,
    contactTagCreate,
    contactTagAdd,
    contactTagRemove,
    // Campaigns
    campaignList,
    campaignGet,
    campaignCreate,
    campaignSend,
    campaignStatsGet,
    // Lists
    listList,
    listCreate,
    listContactsAdd,
    // Forms
    formList,
    formCreate,
    // Automations
    automationList,
    // Account
    meGet,
  ],
  // Personal Access Token only. SendFox formally declares an `oauth2` scheme, but
  // its own documentation names the PAT as the mechanism API clients use, and the
  // authorization-code flow needs a redirect/browser dance a workflow host does
  // not model. See `auth/personal-access-token.ts`.
  auth: [personalAccessToken],
  healthChecks: [service, quota],
} satisfies AppDefinition;
