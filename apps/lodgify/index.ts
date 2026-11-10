/**
 * Lodgify — w6w app, built from Lodgify's public API reference.
 *
 * The spec is https://docs.lodgify.com/reference: every endpoint page embeds its OpenAPI
 * 3.0.3 document (fetched via the `.md` form of each page, 2026-10-05). Every base URL,
 * auth header, path, parameter and field here was checked against those documents; what
 * could not be confirmed is left out and listed in the README.
 *
 * Covered: properties and their room types, availability, rates, bookings (v2 reads, v1
 * writes and status transitions, v2 check-in/out and key codes), enquiries, quotes and
 * payment links, message threads, and webhooks. v2 is used wherever it covers an
 * operation. Only individual fields are deprecated in the reference (room `people`,
 * guest `name`/`phone`, quote `expiration_hours`); the non-deprecated fields are used.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import changeBookingStatus from "./actions/change-booking-status.ts";
import checkInBooking from "./actions/check-in-booking.ts";
import checkOutBooking from "./actions/check-out-booking.ts";
import createBooking from "./actions/create-booking.ts";
import createBookingQuote from "./actions/create-booking-quote.ts";
import createEnquiry from "./actions/create-enquiry.ts";
import createPaymentLink from "./actions/create-payment-link.ts";
import deleteBooking from "./actions/delete-booking.ts";
import getAvailability from "./actions/get-availability.ts";
import getBooking from "./actions/get-booking.ts";
import getBookingQuote from "./actions/get-booking-quote.ts";
import getEnquiry from "./actions/get-enquiry.ts";
import getMessageThread from "./actions/get-message-thread.ts";
import getPaymentLink from "./actions/get-payment-link.ts";
import getProperty from "./actions/get-property.ts";
import getQuote from "./actions/get-quote.ts";
import getRateSettings from "./actions/get-rate-settings.ts";
import getRatesCalendar from "./actions/get-rates-calendar.ts";
import listBookings from "./actions/list-bookings.ts";
import listDeletedProperties from "./actions/list-deleted-properties.ts";
import listProperties from "./actions/list-properties.ts";
import listRooms from "./actions/list-rooms.ts";
import listWebhooks from "./actions/list-webhooks.ts";
import sendMessage from "./actions/send-message.ts";
import subscribeWebhook from "./actions/subscribe-webhook.ts";
import unsubscribeWebhook from "./actions/unsubscribe-webhook.ts";
import updateAvailability from "./actions/update-availability.ts";
import updateBooking from "./actions/update-booking.ts";
import updateBookingKeyCodes from "./actions/update-booking-key-codes.ts";
import updateRates from "./actions/update-rates.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";
import reachability from "./health/reachability.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    changeBookingStatus,
    checkInBooking,
    checkOutBooking,
    createBooking,
    createBookingQuote,
    createEnquiry,
    createPaymentLink,
    deleteBooking,
    getAvailability,
    getBooking,
    getBookingQuote,
    getEnquiry,
    getMessageThread,
    getPaymentLink,
    getProperty,
    getQuote,
    getRateSettings,
    getRatesCalendar,
    listBookings,
    listDeletedProperties,
    listProperties,
    listRooms,
    listWebhooks,
    sendMessage,
    subscribeWebhook,
    unsubscribeWebhook,
    updateAvailability,
    updateBooking,
    updateBookingKeyCodes,
    updateRates,
  ],
  auth: [apiKey],
  healthChecks: [service, api, reachability, quota],
} satisfies AppDefinition;
