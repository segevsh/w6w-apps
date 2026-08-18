/**
 * Statuspage — publish to an Atlassian status page from a workflow: set
 * component statuses, open and update incidents, and read the subscribers who
 * will be told.
 *
 * Paths, the authorization scheme and the rate limit come from Statuspage's own
 * reference (`developer.statuspage.io`, read 2026-08-18); the host and its
 * error shape were verified live the same day.
 *
 * ## This app writes what the rest of this pack reads
 *
 * Nearly every health check in this catalogue consumes a Statuspage document —
 * `components.json`, `summary.json`, `status.json`. This app is the other side
 * of that seam, and it shares their vocabularies exactly: component statuses
 * (`operational` … `major_outage`), incident statuses (`investigating` …
 * `resolved`) and impacts (`none` … `critical`) are the same strings those
 * checks map from.
 *
 * ## One request per second — which shapes the whole design
 *
 * Statuspage: *"Each API token is limited to 1 request / second as measured on
 * a 60 second rolling window."* That is the tightest limit in this pack, and
 * exceeding it answers **`420` or `429`** — the 420 being Statuspage's own,
 * unusual enough that a generic client misreads it.
 *
 * So nothing here loops over components. `incident-create` and
 * `incident-update` both set component statuses **in the same request** that
 * posts the update, and `incident-resolve` restores them in the request that
 * closes the incident. A workflow that instead called `component-status-set`
 * six times would take six seconds, during which the page is half-updated in
 * front of customers.
 *
 * ## Telling customers is a decision, so it is never a default
 *
 * `deliver_notifications` emails, texts and pushes every subscriber
 * immediately, and cannot be recalled. It defaults to **off** on every action
 * that offers it, so an automated first post cannot page an entire customer
 * base off a flapping check. It is per *update*, not per incident — which makes
 * the sensible pattern easy: publish quietly, then notify once, on the update a
 * human has confirmed is worth interrupting somebody for.
 *
 * ## Two mistakes this app is shaped to prevent
 *
 *   - **A red component with no incident.** Setting a status changes a coloured
 *     dot and tells nobody why. `component-status-set` says so and points at
 *     `incident-create`, which does both.
 *   - **A resolved incident above red components.** Closing an incident does
 *     not restore what it broke, so a page ends up reading "all resolved" over
 *     a row of outage dots. `incident-resolve` reads the incident's own
 *     component list and puts them back in the same call.
 *
 * Deliberately out of scope:
 *   - **Creating and deleting subscribers.** Adding somebody to an outage
 *     mailing list is a consent decision, and removing them silently ends a
 *     notification they may be relying on.
 *   - **Page settings, branding and custom domains** — configured once, by a
 *     human, in the Statuspage UI.
 *   - **Postmortems.** They are written prose with a publication workflow of
 *     their own; an automation has nothing useful to say in one.
 *   - **Deleting incidents.** A status page is a public record, and rewriting
 *     history is not something a workflow should make easy — resolving is the
 *     honest close.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import componentStatusSet from "./actions/component-status-set.ts";
import componentList from "./actions/component-list.ts";
import componentCreate from "./actions/component-create.ts";
import componentGroupList from "./actions/component-group-list.ts";

import incidentCreate from "./actions/incident-create.ts";
import incidentUpdate from "./actions/incident-update.ts";
import incidentResolve from "./actions/incident-resolve.ts";
import incidentList from "./actions/incident-list.ts";
import incidentGet from "./actions/incident-get.ts";

import subscriberList from "./actions/subscriber-list.ts";
import metricDataAdd from "./actions/metric-data-add.ts";
import pageList from "./actions/page-list.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // telling customers something is wrong
    incidentCreate,
    incidentUpdate,
    incidentResolve,
    // and what is already open
    incidentList,
    incidentGet,
    // the dots
    componentStatusSet,
    componentList,
    componentCreate,
    componentGroupList,
    // the numbers, and the audience
    metricDataAdd,
    subscriberList,
    pageList,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
