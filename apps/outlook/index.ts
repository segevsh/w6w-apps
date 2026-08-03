import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";

// message
import sendMessage from "./actions/send-message.ts";
import listMessages from "./actions/list-messages.ts";
import getMessage from "./actions/get-message.ts";
import createDraft from "./actions/create-draft.ts";
import sendDraft from "./actions/send-draft.ts";
import replyMessage from "./actions/reply-message.ts";
import forwardMessage from "./actions/forward-message.ts";
import updateMessage from "./actions/update-message.ts";
import moveMessage from "./actions/move-message.ts";
import deleteMessage from "./actions/delete-message.ts";

// mail folder
import listMailFolders from "./actions/list-mail-folders.ts";

// calendar + event
import listCalendars from "./actions/list-calendars.ts";
import listEvents from "./actions/list-events.ts";
import listCalendarView from "./actions/list-calendar-view.ts";
import getEvent from "./actions/get-event.ts";
import createEvent from "./actions/create-event.ts";
import updateEvent from "./actions/update-event.ts";
import deleteEvent from "./actions/delete-event.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    sendMessage,
    listMessages,
    getMessage,
    createDraft,
    sendDraft,
    replyMessage,
    forwardMessage,
    updateMessage,
    moveMessage,
    deleteMessage,
    listMailFolders,
    listCalendars,
    listEvents,
    listCalendarView,
    getEvent,
    createEvent,
    updateEvent,
    deleteEvent,
  ],
  auth: [oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;
