/**
 * Hostaway — w6w app, built from Hostaway's own public API documentation.
 *
 * The spec is `https://api.hostaway.com/documentation` (fetched and read in full
 * 2026-09-22; HTTP 200, ~2.9MB of static Postman-Documenter HTML, confirmed to be the
 * prose itself rather than a shell over a machine-readable OpenAPI/collection file).
 * Every base URL, auth header shape, endpoint path and request/response field in this
 * app was verified against that page; the fields that could not be confirmed there were
 * left out and are listed in the README.
 *
 * What this app covers, in the vendor's own vocabulary — listings (list, get, partial
 * update), the listing calendar (read a range, update an interval), reservations (list,
 * get, create, update, cancel), guest conversations (list, get, list messages, send a
 * message), reviews (list, get), the financial standard report, tasks (list, create) and
 * the static reference data (amenities, property types) that the write endpoints expect
 * ids from.
 *
 * Deliberately absent, and named as such in the README rather than half-built: listing
 * creation and deletion, listing images/fee-settings/agreements/pricing-settings,
 * webhooks and their logs, Stripe/payment-card endpoints, message templates, the
 * cancellation-policy and finance-field sub-surfaces, and the cursor (`afterId`) paging
 * the docs mention alongside `limit`/`offset`.
 *
 * Auth is OAuth2 client credentials against the one public API version, so nothing here
 * needs a browser round-trip. Health is derived from the API itself, because Hostaway
 * publishes no status page (see `health/service.ts`).
 */
import type { AppDefinition } from "@w6w/types";
import clientCredentials from "./auth/client-credentials.ts";

import listListings from "./actions/list-listings.ts";
import getListing from "./actions/get-listing.ts";
import updateListing from "./actions/update-listing.ts";
import getCalendar from "./actions/get-calendar.ts";
import updateCalendar from "./actions/update-calendar.ts";
import listReservations from "./actions/list-reservations.ts";
import getReservation from "./actions/get-reservation.ts";
import createReservation from "./actions/create-reservation.ts";
import updateReservation from "./actions/update-reservation.ts";
import cancelReservation from "./actions/cancel-reservation.ts";
import listConversations from "./actions/list-conversations.ts";
import getConversation from "./actions/get-conversation.ts";
import listConversationMessages from "./actions/list-conversation-messages.ts";
import sendConversationMessage from "./actions/send-conversation-message.ts";
import listReviews from "./actions/list-reviews.ts";
import getReview from "./actions/get-review.ts";
import getFinanceStandardReport from "./actions/get-finance-standard-report.ts";
import listTasks from "./actions/list-tasks.ts";
import createTask from "./actions/create-task.ts";
import listAmenities from "./actions/list-amenities.ts";
import listPropertyTypes from "./actions/list-property-types.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";
import reachability from "./health/reachability.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // listings and their calendar
    listListings,
    getListing,
    updateListing,
    getCalendar,
    updateCalendar,
    // reservations
    listReservations,
    getReservation,
    createReservation,
    updateReservation,
    cancelReservation,
    // guest conversations
    listConversations,
    getConversation,
    listConversationMessages,
    sendConversationMessage,
    // reviews
    listReviews,
    getReview,
    // finance
    getFinanceStandardReport,
    // tasks
    listTasks,
    createTask,
    // static reference data
    listAmenities,
    listPropertyTypes,
  ],
  auth: [clientCredentials],
  healthChecks: [service, api, reachability, quota],
} satisfies AppDefinition;
