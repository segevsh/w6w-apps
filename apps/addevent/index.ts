/**
 * AddEvent — the "add to calendar" link and event-management platform, over the
 * Calendar & Events API v2 (`api.addevent.com/calevent/v2`).
 *
 * Every path, verb, parameter, response field and error shape in this app was
 * verified on 2026-09-15 against AddEvent's own OpenAPI 3.1 document (`v2.14.0`),
 * recovered from the `oasDefinition` embedded in its ReadMe-hosted API reference
 * pages (`docs.addevent.com/reference/*`) — plus live probes against
 * `api.addevent.com`. The marketing-site "Calendar & Events API" prose page
 * (`www.addevent.com/c/documentation/calendar-events-api`) explicitly disclaims
 * its own field examples as illustrative, so nothing here is taken from it beyond
 * the base URL and auth scheme, both independently confirmed live.
 *
 * The three findings that shaped this app:
 *
 *  1. **API access is a paid-plan feature, not a per-key scope.** AddEvent's own
 *     response-code reference draws a hard line between `401` ("no valid API key
 *     provided") and `403` ("the API key doesn't have permission to perform the
 *     request" — the free Hobby plan does not include API access at all, or a
 *     usage limit was exceeded). Collapsing both into "bad credential" would tell
 *     a Hobby-plan user to re-paste a key that was never going to work. See
 *     `auth/api-key.ts` and `lib/client.ts`.
 *  2. **The real endpoint-level reference lives behind a redirect chain the
 *     marketing docs don't fully spell out.** `www.addevent.com/documentation`
 *     301s to `/c/documentation`, whose "Calendar & Events API" page in turn links
 *     out to `docs.addevent.com/reference` — a ReadMe.io-hosted, React-rendered
 *     API explorer. The actual OpenAPI 3.1 schema is not exposed at any published
 *     URL; it has to be read out of that page's server-rendered `<script
 *     id="ssr-props">` JSON payload (`oasDefinition`). Every action, param and
 *     error shape below is sourced from that document, not from the prose pages.
 *  3. **A real status page and its unclaimed decoy sit right next to each other.**
 *     `addevent.statuspage.io` is AddEvent's genuine Atlassian Statuspage (real
 *     component names: Dashboard, Website, API, Landing Pages). `addevent.instatus.com`
 *     also answers `200`, but is the generic, unclaimed Instatus placeholder page —
 *     confirmed by title text, not by guessing from the URL. See `health/service.ts`.
 *
 * AddEvent publishes no rate-limit or usage-quota signal anywhere (no header, no
 * metering endpoint) — `health/quota.ts` states that as a declared absence rather
 * than a silent gap.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import eventCreate from "./actions/event-create.ts";
import eventSearch from "./actions/event-search.ts";
import eventRetrieve from "./actions/event-retrieve.ts";
import eventUpdate from "./actions/event-update.ts";
import eventDelete from "./actions/event-delete.ts";

import calendarCreate from "./actions/calendar-create.ts";
import calendarSearch from "./actions/calendar-search.ts";
import calendarRetrieve from "./actions/calendar-retrieve.ts";
import calendarUpdate from "./actions/calendar-update.ts";
import calendarDelete from "./actions/calendar-delete.ts";

import rsvpAttendeeCreate from "./actions/rsvp-attendee-create.ts";
import rsvpAttendeeSearch from "./actions/rsvp-attendee-search.ts";
import rsvpAttendeeRetrieve from "./actions/rsvp-attendee-retrieve.ts";
import rsvpAttendeeUpdate from "./actions/rsvp-attendee-update.ts";
import rsvpAttendeeDelete from "./actions/rsvp-attendee-delete.ts";

import calendarSubscriberSearch from "./actions/calendar-subscriber-search.ts";
import calendarSubscriberRetrieve from "./actions/calendar-subscriber-retrieve.ts";
import calendarSubscriberDelete from "./actions/calendar-subscriber-delete.ts";

import rsvpFormList from "./actions/rsvp-form-list.ts";
import eventTemplateList from "./actions/event-template-list.ts";
import calendarTemplateList from "./actions/calendar-template-list.ts";
import timezoneList from "./actions/timezone-list.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Events
    eventCreate,
    eventSearch,
    eventRetrieve,
    eventUpdate,
    eventDelete,
    // Calendars
    calendarCreate,
    calendarSearch,
    calendarRetrieve,
    calendarUpdate,
    calendarDelete,
    // RSVP attendees
    rsvpAttendeeCreate,
    rsvpAttendeeSearch,
    rsvpAttendeeRetrieve,
    rsvpAttendeeUpdate,
    rsvpAttendeeDelete,
    // Calendar subscribers (read/delete only — subscribers are created by the
    // vendor's own subscribe flow, not through this API)
    calendarSubscriberSearch,
    calendarSubscriberRetrieve,
    calendarSubscriberDelete,
    // Templates & timezones
    rsvpFormList,
    eventTemplateList,
    calendarTemplateList,
    timezoneList,
  ],
  // API key only. AddEvent publishes no OAuth surface — the API key from the
  // account settings page is the entire authentication story.
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
