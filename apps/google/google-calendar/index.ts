import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";
import eventChanged from "./triggers/event-changed.ts";
import newEvent from "./triggers/new-event.ts";
import eventUpdated from "./triggers/event-updated.ts";
import eventCancelled from "./triggers/event-cancelled.ts";
import eventStarted from "./triggers/event-started.ts";
import eventEnded from "./triggers/event-ended.ts";
import newCalendar from "./triggers/new-calendar.ts";
import serviceAccount from "./auth/service-account.ts";
import listCalendars from "./actions/list-calendars.ts";
import getAvailability from "./actions/get-availability.ts";
import createEvent from "./actions/create-event.ts";
import getEvent from "./actions/get-event.ts";
import listEvents from "./actions/list-events.ts";
import updateEvent from "./actions/update-event.ts";
import deleteEvent from "./actions/delete-event.ts";
import quickCreateEvent from "./actions/quick-create-event.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    listCalendars,
    getAvailability,
    createEvent,
    getEvent,
    listEvents,
    updateEvent,
    deleteEvent,
    quickCreateEvent,
  ],
  auth: [oauth2, serviceAccount],
  triggers: [
    eventChanged,
    newEvent,
    eventUpdated,
    eventCancelled,
    eventStarted,
    eventEnded,
    newCalendar,
  ],
  healthChecks: [service, quota],
} satisfies AppDefinition;
