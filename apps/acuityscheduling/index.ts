import type { AppDefinition } from "@w6w/types";
import basic from "./auth/basic.ts";
import oauth2 from "./auth/oauth2.ts";
import appointmentGetMany from "./actions/appointment-get-many.ts";
import appointmentGet from "./actions/appointment-get.ts";
import appointmentCreate from "./actions/appointment-create.ts";
import appointmentCancel from "./actions/appointment-cancel.ts";
import appointmentReschedule from "./actions/appointment-reschedule.ts";
import appointmentTypeGetMany from "./actions/appointment-type-get-many.ts";
import calendarGetMany from "./actions/calendar-get-many.ts";
import clientGetMany from "./actions/client-get-many.ts";
import availabilityTimeGetMany from "./actions/availability-time-get-many.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // appointment
    appointmentGetMany,
    appointmentGet,
    appointmentCreate,
    appointmentCancel,
    appointmentReschedule,
    // appointment-type
    appointmentTypeGetMany,
    // calendar
    calendarGetMany,
    // client
    clientGetMany,
    // availability
    availabilityTimeGetMany,
  ],
  // Basic first (single-account default, matches Acuity's own docs), OAuth for public integrations.
  auth: [basic, oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;
