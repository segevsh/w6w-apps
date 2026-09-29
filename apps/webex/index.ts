/**
 * Webex — Cisco's messaging, meeting and calling platform. This app covers
 * the Webex Messaging REST API (`webexapis.com/v1`): rooms (spaces),
 * messages, memberships, teams, team memberships, webhooks, and a read-only
 * slice of People.
 *
 * Every path, verb, parameter and enum here was read directly out of
 * `developer.webex.com`'s own API reference on 2026-09-29 — each reference
 * page embeds a per-operation OpenAPI 3.0.3 fragment in
 * `window.__INITIAL_STATE__.apiReference.entry.entries[].versions[].spec`,
 * fetched from the People, Rooms, Messages, Memberships, Teams, Team
 * Memberships and Webhooks pages — plus live probes against `webexapis.com`.
 * Nothing here came from a third-party integration directory.
 *
 * Two findings that shaped the design:
 *
 *  1. **Webhook reads echo the signing secret.** Webex's own schema lists
 *     `secret` on `Create`, `Get`, `Update` and every `List Webhooks` item,
 *     with an identical example across all four — confirmed 2026-09-29. See
 *     {@link "./lib/client.ts".stripWebhookSecret}.
 *  2. **People is deprecated for writes, not reads.** Since January 2024
 *     Webex's own callout on the People reference says to use SCIM 2.0 for
 *     provisioning; this app therefore ships `get-my-own-details`,
 *     `get-person` and `list-people` but no create/update/delete-person.
 *
 * Multi-valued query parameters (`List People`'s `id`/`roles`, `List
 * Messages`' `mentionedPeople`) are sent as one comma-joined value — Webex's
 * own prose is explicit for the ones that document an example ("Accepts up
 * to 85 person IDs separated by commas") and silent for the rest, so this app
 * treats them uniformly rather than guessing a second wire format.
 *
 * Deliberately absent: Webex Calling, Meetings, Recordings and every
 * admin-only surface (Organizations, Licenses, SCIM, Devices, Reports, ...)
 * — separate products/audiences from the messaging surface this app targets.
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";

import listRooms from "./actions/list-rooms.ts";
import createRoom from "./actions/create-room.ts";
import getRoom from "./actions/get-room.ts";
import updateRoom from "./actions/update-room.ts";
import deleteRoom from "./actions/delete-room.ts";

import listMessages from "./actions/list-messages.ts";
import listDirectMessages from "./actions/list-direct-messages.ts";
import createMessage from "./actions/create-message.ts";
import getMessage from "./actions/get-message.ts";
import editMessage from "./actions/edit-message.ts";
import deleteMessage from "./actions/delete-message.ts";

import listMemberships from "./actions/list-memberships.ts";
import createMembership from "./actions/create-membership.ts";
import getMembership from "./actions/get-membership.ts";
import updateMembership from "./actions/update-membership.ts";
import deleteMembership from "./actions/delete-membership.ts";

import listTeams from "./actions/list-teams.ts";
import createTeam from "./actions/create-team.ts";
import getTeam from "./actions/get-team.ts";
import updateTeam from "./actions/update-team.ts";
import deleteTeam from "./actions/delete-team.ts";

import listTeamMemberships from "./actions/list-team-memberships.ts";
import createTeamMembership from "./actions/create-team-membership.ts";
import getTeamMembership from "./actions/get-team-membership.ts";
import updateTeamMembership from "./actions/update-team-membership.ts";
import deleteTeamMembership from "./actions/delete-team-membership.ts";

import listWebhooks from "./actions/list-webhooks.ts";
import createWebhook from "./actions/create-webhook.ts";
import getWebhook from "./actions/get-webhook.ts";
import updateWebhook from "./actions/update-webhook.ts";
import deleteWebhook from "./actions/delete-webhook.ts";

import getMyOwnDetails from "./actions/get-my-own-details.ts";
import getPerson from "./actions/get-person.ts";
import listPeople from "./actions/list-people.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Rooms
    listRooms,
    createRoom,
    getRoom,
    updateRoom,
    deleteRoom,
    // Messages
    listMessages,
    listDirectMessages,
    createMessage,
    getMessage,
    editMessage,
    deleteMessage,
    // Memberships
    listMemberships,
    createMembership,
    getMembership,
    updateMembership,
    deleteMembership,
    // Teams
    listTeams,
    createTeam,
    getTeam,
    updateTeam,
    deleteTeam,
    // Team memberships
    listTeamMemberships,
    createTeamMembership,
    getTeamMembership,
    updateTeamMembership,
    deleteTeamMembership,
    // Webhooks
    listWebhooks,
    createWebhook,
    getWebhook,
    updateWebhook,
    deleteWebhook,
    // People (read-only)
    getMyOwnDetails,
    getPerson,
    listPeople,
  ],
  auth: [oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;
