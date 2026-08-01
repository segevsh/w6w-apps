import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";
import bookingGetMany from "./actions/booking-get-many.ts";
import bookingGet from "./actions/booking-get.ts";
import bookingCreate from "./actions/booking-create.ts";
import bookingCancel from "./actions/booking-cancel.ts";
import bookingReschedule from "./actions/booking-reschedule.ts";
import eventTypeGetMany from "./actions/event-type-get-many.ts";
import eventTypeGet from "./actions/event-type-get.ts";
import scheduleGetMany from "./actions/schedule-get-many.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // booking
    bookingGetMany,
    bookingGet,
    bookingCreate,
    bookingCancel,
    bookingReschedule,
    // event-type
    eventTypeGetMany,
    eventTypeGet,
    // schedule
    scheduleGetMany,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
