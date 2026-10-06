import type { AppDefinition } from "@w6w/types";
import basic from "./auth/basic.ts";

import userList from "./actions/user-list.ts";
import userGet from "./actions/user-get.ts";
import userCreate from "./actions/user-create.ts";
import userUpdate from "./actions/user-update.ts";
import userDeactivate from "./actions/user-deactivate.ts";
import teamList from "./actions/team-list.ts";
import teamGet from "./actions/team-get.ts";
import teamCreate from "./actions/team-create.ts";
import teamUpdate from "./actions/team-update.ts";
import teamDelete from "./actions/team-delete.ts";
import meetingEventList from "./actions/meeting-event-list.ts";
import meetingEventGet from "./actions/meeting-event-get.ts";
import meetingEventCreate from "./actions/meeting-event-create.ts";
import meetingEventDelete from "./actions/meeting-event-delete.ts";
import meetingEventLaunchBot from "./actions/meeting-event-launch-bot.ts";
import callList from "./actions/call-list.ts";
import callGet from "./actions/call-get.ts";
import callCreate from "./actions/call-create.ts";
import callPresignRecording from "./actions/call-presign-recording.ts";
import callNoteList from "./actions/call-note-list.ts";
import callNoteGet from "./actions/call-note-get.ts";
import callNoteUpdate from "./actions/call-note-update.ts";
import callNoteDelete from "./actions/call-note-delete.ts";
import clientCompanyList from "./actions/client-company-list.ts";
import clientCompanyCreate from "./actions/client-company-create.ts";
import clientCompanyUpdate from "./actions/client-company-update.ts";
import clientCompanyDeactivate from "./actions/client-company-deactivate.ts";
import clientSubscriptionStart from "./actions/client-subscription-start.ts";
import clientSubscriptionCancel from "./actions/client-subscription-cancel.ts";
import clientTeamList from "./actions/client-team-list.ts";
import clientTeamGet from "./actions/client-team-get.ts";
import clientTeamCreate from "./actions/client-team-create.ts";
import clientTeamUpdate from "./actions/client-team-update.ts";
import clientTeamDelete from "./actions/client-team-delete.ts";
import clientUserList from "./actions/client-user-list.ts";
import clientUserGet from "./actions/client-user-get.ts";
import clientUserCreate from "./actions/client-user-create.ts";
import clientUserUpdate from "./actions/client-user-update.ts";
import clientUserDeactivate from "./actions/client-user-deactivate.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

/**
 * Leexi — AI meeting assistant and call recorder. Built from the per-endpoint OpenAPI
 * documents at docs.public-api.leexi.ai (there is no standalone openapi.json). Webhooks
 * (`call.processed`) are inbound events, not callable endpoints, and are not covered.
 */
export default {
  actions: [
    // Users
    userList,
    userGet,
    userCreate,
    userUpdate,
    userDeactivate,
    // Teams
    teamList,
    teamGet,
    teamCreate,
    teamUpdate,
    teamDelete,
    // Meeting events
    meetingEventList,
    meetingEventGet,
    meetingEventCreate,
    meetingEventDelete,
    meetingEventLaunchBot,
    // Calls
    callList,
    callGet,
    callCreate,
    callPresignRecording,
    // Call notes
    callNoteList,
    callNoteGet,
    callNoteUpdate,
    callNoteDelete,
    // Reseller: client companies
    clientCompanyList,
    clientCompanyCreate,
    clientCompanyUpdate,
    clientCompanyDeactivate,
    // Reseller: subscriptions
    clientSubscriptionStart,
    clientSubscriptionCancel,
    // Reseller: client teams
    clientTeamList,
    clientTeamGet,
    clientTeamCreate,
    clientTeamUpdate,
    clientTeamDelete,
    // Reseller: client users
    clientUserList,
    clientUserGet,
    clientUserCreate,
    clientUserUpdate,
    clientUserDeactivate,
  ],
  auth: [basic],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
