/**
 * Cloudbeds — a hotel and property-management platform: reservations, guests,
 * room types and rates, and the properties themselves, over the Cloudbeds PMS
 * API v1.3 (`api.cloudbeds.com`).
 *
 * Every path, verb, query parameter, body field and enum in this app was
 * verified on 2026-09-22 against the OpenAPI 3.0.1 document Cloudbeds embeds in
 * its own reference pages (`developers.cloudbeds.com/reference/<slug>.md`,
 * discovered through the site's `sitemap.xml`), plus live probes against
 * `api.cloudbeds.com` and `status.cloudbeds.com`. Nothing here came from a
 * third-party integration directory, and nothing was inferred from a sibling
 * vendor's shape.
 *
 * Four findings shaped the design, each documented where it matters:
 *
 *  1. **HTTP 200 is not success** (`lib/client.ts`). Cloudbeds answers some
 *     failures with `200 {"success": false, "message": "…"}` — a deactivated
 *     approving user, an inactive property, a token that does not cover the
 *     requested property. The client treats that as a failure with the vendor's
 *     own message, exactly like a 4xx.
 *  2. **The base URL is not the one in the brief** (`lib/client.ts`). It is
 *     `https://api.cloudbeds.com/api/v1.3`, and the guessed `…/{method}` answers
 *     a 404 HTML marketing page rather than a JSON refusal.
 *  3. **The status page is component-scoped, and this app is one component of
 *     it** (`health/service.ts`). Only "Property Management System" speaks for
 *     the API these actions call; the other nine components are reported as
 *     detail. The obvious page-level roll-up would report this app down because
 *     of an unrelated marketing connector's incident.
 *  4. **A usable reservation is not a schema-valid one** (`actions/
 *     reservation-create.ts`). Cloudbeds marks *nothing* required on
 *     `postReservation`; the fields a reservation actually needs are documented
 *     in the action's hints rather than over-constraining the type.
 *
 * Auth is OAuth 2.0 authorization-code — the technology-partner flow — with the
 * credential stamped as `Authorization: Bearer <token>` by the `sign` hook
 * alone. No action ever sees it.
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";

import hotelList from "./actions/hotel-list.ts";
import hotelGet from "./actions/hotel-get.ts";
import dashboardGet from "./actions/dashboard-get.ts";
import roomTypeList from "./actions/room-type-list.ts";
import roomTypeAvailabilityList from "./actions/room-type-availability-list.ts";
import ratePlanList from "./actions/rate-plan-list.ts";
import reservationList from "./actions/reservation-list.ts";
import reservationGet from "./actions/reservation-get.ts";
import reservationCreate from "./actions/reservation-create.ts";
import reservationUpdate from "./actions/reservation-update.ts";
import guestList from "./actions/guest-list.ts";
import guestGet from "./actions/guest-get.ts";
import guestUpdate from "./actions/guest-update.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Properties
    hotelList,
    hotelGet,
    dashboardGet,
    // Inventory and pricing
    roomTypeList,
    roomTypeAvailabilityList,
    ratePlanList,
    // Reservations
    reservationList,
    reservationGet,
    reservationCreate,
    reservationUpdate,
    // Guests
    guestList,
    guestGet,
    guestUpdate,
  ],
  // OAuth 2.0 authorization-code only. Cloudbeds also accepts API keys ("the
  // preferred authentication method" in its own docs), but this app ships the
  // partner flow the marketplace registration produces; the two share a host
  // and a `Bearer` header, so an api-key method could sit beside this one
  // without touching `lib/client.ts`.
  auth: [oauth2],
  // The credential probe is not declared here: it is the `oauth2` method's own
  // `test` hook, projected automatically as `auth:oauth2`. `quota` is a declared
  // absence, not a probe.
  healthChecks: [service, quota],
} satisfies AppDefinition;
