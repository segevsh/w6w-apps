/**
 * NationBuilder — people, lists, events, donations and tags, on a nation's
 * own `{slug}.nationbuilder.com` subdomain.
 *
 * Every path, parameter and response shape here was taken from the vendor's
 * own downloadable OpenAPI 3.1 spec (`nationbuilder.com/api/v2/reference` →
 * `docs/v2/released.yaml`, fetched 2026-09-15) plus the support-docs
 * articles it links: `9903805-api-authentication-guide`,
 * `9757369-nationbuilder-v2-api-core-concepts`,
 * `9869274-nationbuilder-api-quickstart-guide`,
 * `9559128-generating-api-tokens`, `9868960-api-rate-limit-policy`,
 * `9917278-using-parameters-to-interact-with-the-nationbuilder-api`.
 *
 * ## The base URL is per-nation, and it is a Connection field
 *
 * NationBuilder is multi-tenant by subdomain — every customer ("nation") is
 * `{slug}.nationbuilder.com`, confirmed as the `servers.url` template in the
 * vendor's own OpenAPI spec. A manifest cannot enumerate every nation, so
 * `w6w.network.allow` declares `*.nationbuilder.com` and the slug is
 * collected on the Connection (both auth methods below), exactly the
 * pattern this pack already uses for Zendesk's `{subdomain}` and Mautic's
 * self-hosted `baseUrl`.
 *
 * ## Three things that would cost someone a day
 *
 *   - **"Contacts" is not the CRM contact.** `POST /api/v2/contacts` creates
 *     a logged record of a single contact *attempt* (a canvass call, a door
 *     knock, a text — `contact_method`/`contact_status`/`content`), not a
 *     person. The actual person record is called a **"signup"** everywhere
 *     in NationBuilder's own docs and schema. This app exposes signups as
 *     "person" (matching the rest of this pack's CRM vocabulary) and breaks
 *     the logged-attempt resource out as its own `contact-log-create`
 *     action, specifically so the two cannot be confused. See
 *     `actions/contact-log-create.ts`.
 *   - **An event has no name of its own.** The `event` resource's writable
 *     attributes have no `name`/`title` field — the public-facing name lives
 *     on a **Page** the event is attached to via a `page` relationship,
 *     created inline through a JSON:API sidepost. NationBuilder's own "Core
 *     Concepts" guide mentions this pattern for petitions ("creating a
 *     petition requires the creation of a page at the same time") but never
 *     says it about events directly — it only shows up by reading the event
 *     schema's relationships. See `actions/event-create.ts`.
 *   - **OAuth app registration is gated, not self-serve.** The "API
 *     Authentication Guide" states plainly: "Developer tools are only
 *     available to NationBuilder certified developers or nations on an
 *     Enterprise or Network plan." A nation on a lower plan without
 *     certified-developer status cannot register the OAuth app this needs a
 *     Client ID/Secret from at all — which is why `auth/api-token.ts`'s
 *     short-lived personal token exists alongside OAuth, as the only way to
 *     reach such a nation, at the cost of a 24-hour, non-refreshable token.
 *
 * ## Errors and pagination
 *
 * Every response is a JSON:API document; a validation failure (422) is
 * `{ errors: [{ detail, title, code, source, meta }] }`, everything else is
 * `{ code, message }` — both read by `lib/client.ts#errorMessage`. Index
 * endpoints page with `page[size]`/`page[number]` (default 20, max 100) and
 * filter with `filter[attribute]=value`, including documented operator
 * suffixes (`filter[amount][gt]=500`) — see `lib/params.ts#FILTER_PARAM`.
 *
 * Deliberately out of scope: petitions, surveys, path/automation builders,
 * imports, memberships, precincts, ballots, elections, broadcasters,
 * mailings and NationBuilder's own website/CMS surfaces beyond the minimal
 * Page sidepost `event-create` needs. Each is its own large surface, and
 * none of it is the daily loop of managing people, lists, events, donations
 * and tags a workflow actually touches.
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";
import apiToken from "./auth/api-token.ts";

import personGet from "./actions/person-get.ts";
import personList from "./actions/person-list.ts";
import personCreate from "./actions/person-create.ts";
import personUpdate from "./actions/person-update.ts";
import personDelete from "./actions/person-delete.ts";
import personTagAdd from "./actions/person-tag-add.ts";
import contactLogCreate from "./actions/contact-log-create.ts";
import listList from "./actions/list-list.ts";
import listGet from "./actions/list-get.ts";
import listCreate from "./actions/list-create.ts";
import listPeopleList from "./actions/list-people-list.ts";
import listAddPeople from "./actions/list-add-people.ts";
import listRemovePeople from "./actions/list-remove-people.ts";
import eventList from "./actions/event-list.ts";
import eventGet from "./actions/event-get.ts";
import eventCreate from "./actions/event-create.ts";
import eventRsvpCreate from "./actions/event-rsvp-create.ts";
import donationList from "./actions/donation-list.ts";
import donationGet from "./actions/donation-get.ts";
import donationCreate from "./actions/donation-create.ts";
import tagList from "./actions/tag-list.ts";
import tagCreate from "./actions/tag-create.ts";
import customFieldList from "./actions/custom-field-list.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";
import nation from "./health/nation.ts";

export default {
  actions: [
    // people
    personGet,
    personList,
    personCreate,
    personUpdate,
    personDelete,
    personTagAdd,
    contactLogCreate,
    // lists
    listList,
    listGet,
    listCreate,
    listPeopleList,
    listAddPeople,
    listRemovePeople,
    // events
    eventList,
    eventGet,
    eventCreate,
    eventRsvpCreate,
    // donations
    donationList,
    donationGet,
    donationCreate,
    // tags
    tagList,
    tagCreate,
    // custom fields
    customFieldList,
  ],
  auth: [oauth2, apiToken],
  healthChecks: [service, quota, nation],
} satisfies AppDefinition;
