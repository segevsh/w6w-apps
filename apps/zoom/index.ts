/**
 * Zoom — w6w app, seeded from n8n's `Zoom` node.
 *
 * n8n's node exposes only the meeting resource and authenticates with a JWT
 * app — a credential type Zoom retired in 2023, so it is not carried over.
 * This port covers meeting, registrant, webinar, user and cloud recording, and
 * offers the two credential types Zoom actually supports today:
 *
 *   - **Server-to-Server OAuth** (`auth/server-to-server.ts`) — the
 *     `account_credentials` grant. No browser round-trip, so it keeps working
 *     in scheduled and background runs. It is also the app in this pack that
 *     exercises the full Auth lifecycle: `exchange` mints the first token from
 *     the pasted account credentials, `refresh` re-mints it when it expires
 *     (Zoom's last an hour), and `sign` stamps it on each request.
 *   - **OAuth 2.0** — the browser sign-in path, for acting as the individual
 *     who connected.
 *
 * Zoom's OAuth host (`zoom.us`) is distinct from its API host
 * (`api.zoom.us`), so both are on the egress allowlist — the implicit
 * allowance only covers endpoints declared in an `oauth2` block, and
 * `server-to-server` mints its token by hand.
 *
 * Triggers: event-subscription webhooks (signed by Zoom's Secret Token), polls for new
 * recordings, meetings, webinars and users. Zoom Phone / Contact Center are separate products
 * and are deliberately absent.
 */
import type { AppDefinition } from "@w6w/types";
import serverToServer from "./auth/server-to-server.ts";
import oauth2 from "./auth/oauth2.ts";

import meetingCreate from "./actions/meeting-create.ts";
import meetingGet from "./actions/meeting-get.ts";
import meetingUpdate from "./actions/meeting-update.ts";
import meetingDelete from "./actions/meeting-delete.ts";
import meetingGetMany from "./actions/meeting-get-many.ts";
import meetingAddRegistrant from "./actions/meeting-add-registrant.ts";
import meetingGetRegistrants from "./actions/meeting-get-registrants.ts";

import webinarCreate from "./actions/webinar-create.ts";
import webinarGet from "./actions/webinar-get.ts";
import webinarGetMany from "./actions/webinar-get-many.ts";

import userGet from "./actions/user-get.ts";
import userGetMany from "./actions/user-get-many.ts";

import recordingGetMany from "./actions/recording-get-many.ts";
import recordingDelete from "./actions/recording-delete.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";
import newRecording from "./triggers/new-recording.ts";
import meetingCreated from "./triggers/meeting-created.ts";
import meetingUpdated from "./triggers/meeting-updated.ts";
import meetingDeleted from "./triggers/meeting-deleted.ts";
import meetingStarted from "./triggers/meeting-started.ts";
import meetingEnded from "./triggers/meeting-ended.ts";
import meetingRegistrationCreated from "./triggers/meeting-registration-created.ts";
import webinarCreated from "./triggers/webinar-created.ts";
import webinarUpdated from "./triggers/webinar-updated.ts";
import webinarDeleted from "./triggers/webinar-deleted.ts";
import webinarStarted from "./triggers/webinar-started.ts";
import webinarEnded from "./triggers/webinar-ended.ts";
import userCreated from "./triggers/user-created.ts";
import userUpdated from "./triggers/user-updated.ts";
import userDeleted from "./triggers/user-deleted.ts";
import recordingCompleted from "./triggers/recording-completed.ts";
import anyEvent from "./triggers/any-event.ts";
import newMeeting from "./triggers/new-meeting.ts";
import newWebinar from "./triggers/new-webinar.ts";
import newUser from "./triggers/new-user.ts";

export default {
  actions: [
    // meeting
    meetingCreate,
    meetingGet,
    meetingUpdate,
    meetingDelete,
    meetingGetMany,
    // registrant
    meetingAddRegistrant,
    meetingGetRegistrants,
    // webinar
    webinarCreate,
    webinarGet,
    webinarGetMany,
    // user
    userGet,
    userGetMany,
    // recording
    recordingGetMany,
    recordingDelete,
  ],
  auth: [serverToServer, oauth2],
  healthChecks: [service, quota],
  triggers: [
    newRecording,
    meetingCreated,
    meetingUpdated,
    meetingDeleted,
    meetingStarted,
    meetingEnded,
    meetingRegistrationCreated,
    webinarCreated,
    webinarUpdated,
    webinarDeleted,
    webinarStarted,
    webinarEnded,
    userCreated,
    userUpdated,
    userDeleted,
    recordingCompleted,
    anyEvent,
    newMeeting,
    newWebinar,
    newUser,
  ],
} satisfies AppDefinition;
