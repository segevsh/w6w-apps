/**
 * FareHarbor — booking software for tour and activity operators: companies, items, availability
 * and bookings over the External API (`fareharbor.com/api/external/v1`).
 *
 * Built from FareHarbor's own OpenAPI 3.1 document (the file developer.fareharbor.com's Redoc
 * page loads, 27 paths) and live unauthenticated probes on 2026-10-06. Things that shape the code:
 *
 *   - **Two keys, two headers.** `X-FareHarbor-API-App` + `X-FareHarbor-API-User`, both set in
 *     `sign`. The user key is issued per currency, so a Connection is one currency.
 *   - **Errors are `{error, status, code}`.** Verdicts come from `code`, because a 403 is also
 *     what rate limiting answers.
 *   - **Flags are `yes`/`no`**, not `true`/`false` — the client writes booleans that way.
 *   - **Availability ranges time out** (504 at 60 s). The two availability actions are the
 *     documented "minimal" forms, which also exclude custom fields.
 *   - **`validate` reports refusal in a 200** (`is_bookable: false`, `code`, `error`).
 *   - **Production only.** The sandbox lives on `demo.fareharbor.com`; the manifest allows one
 *     API host, so demo keys do not work here.
 *   - **Status page has no API component**; health reads Booking, Calendar and Booking Webhook.
 *
 * Deliberately absent (see README): the QR-code check-in route, crew-member writes, custom-field
 * value updates, resource-use patches, and the webhook endpoints (inbound — configured by
 * FareHarbor, not callable).
 */
import type { AppDefinition } from "@w6w/types";
import apiKeys from "./auth/api-keys.ts";

import companyList from "./actions/company-list.ts";
import companyGet from "./actions/company-get.ts";
import userList from "./actions/user-list.ts";
import roleList from "./actions/role-list.ts";
import lodgingList from "./actions/lodging-list.ts";
import checkinStatusList from "./actions/checkin-status-list.ts";
import agentList from "./actions/agent-list.ts";
import deskList from "./actions/desk-list.ts";
import itemList from "./actions/item-list.ts";
import itemGet from "./actions/item-get.ts";
import availabilityGet from "./actions/availability-get.ts";
import availabilityLodgingList from "./actions/availability-lodging-list.ts";
import availabilityListByDate from "./actions/availability-list-by-date.ts";
import availabilityListByDateRange from "./actions/availability-list-by-date-range.ts";
import crewMemberList from "./actions/crew-member-list.ts";
import bookingListByAvailability from "./actions/booking-list-by-availability.ts";
import bookingListByCreateDate from "./actions/booking-list-by-create-date.ts";
import bookingGet from "./actions/booking-get.ts";
import bookingValidate from "./actions/booking-validate.ts";
import bookingCreate from "./actions/booking-create.ts";
import bookingCancel from "./actions/booking-cancel.ts";
import bookingNoteUpdate from "./actions/booking-note-update.ts";
import bookingCheckin from "./actions/booking-checkin.ts";
import bookingResendConfirmation from "./actions/booking-resend-confirmation.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    companyList,
    companyGet,
    userList,
    roleList,
    lodgingList,
    checkinStatusList,
    agentList,
    deskList,
    itemList,
    itemGet,
    availabilityListByDate,
    availabilityListByDateRange,
    availabilityGet,
    availabilityLodgingList,
    crewMemberList,
    bookingListByAvailability,
    bookingListByCreateDate,
    bookingGet,
    bookingValidate,
    bookingCreate,
    bookingCancel,
    bookingNoteUpdate,
    bookingCheckin,
    bookingResendConfirmation,
  ],
  auth: [apiKeys],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
