/**
 * Fathom — the AI meeting notetaker (fathom.video / fathom.ai), via its
 * **External API** at `https://api.fathom.ai/external/v1`.
 *
 * > **Not Fathom Analytics.** `usefathom.com` is an unrelated privacy-focused
 * > web-analytics product with its own, different API. This app is the meeting
 * > assistant that joins Zoom / Google Meet / Microsoft Teams calls and produces
 * > transcripts, summaries and action items.
 *
 * ## Coverage
 *
 * Fathom's public API is **small and read-mostly**, and this app covers all of
 * it: every one of the eleven operations in the vendor's own OpenAPI document
 * (`developers.fathom.ai/api-reference/openapi.yaml`, fetched 2026-08-03) has an
 * Action here. There is nothing held back and nothing padded — nine reads across
 * meetings, meeting types, recordings, teams, team members and users, plus the
 * two webhook writes.
 *
 * ## Deliberately absent
 *
 *   - **Anything that writes a meeting.** Fathom's API cannot create, edit,
 *     re-summarise, share or delete a recording, cannot mark an action item
 *     complete, and cannot start or stop the notetaker. Those are not omissions
 *     — the endpoints do not exist.
 *   - **A Trigger for the inbound webhook.** Create/Delete Webhook are here
 *     because they are real endpoints, but modelling Fathom's
 *     "new meeting content ready" delivery as a `TriggerDefinition` is a
 *     separate piece of work (it needs `onSubscribe`/`handleIngest` and the
 *     `webhook-signature` verification described in Fathom's docs).
 *   - **OAuth2.** Fathom supports it, but the authorization endpoint is not
 *     published anywhere in its docs and credentials require partner review —
 *     see the note in `auth/api-key.ts`.
 *   - **A list-webhooks endpoint.** There isn't one; ids come from the create
 *     response or from Fathom's settings UI.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import meetingGetMany from "./actions/meeting-get-many.ts";
import meetingTypeGetMany from "./actions/meeting-type-get-many.ts";
import recordingGetSummary from "./actions/recording-get-summary.ts";
import recordingGetTranscript from "./actions/recording-get-transcript.ts";
import recordingDownloadRequest from "./actions/recording-download-request.ts";
import recordingDownloadGet from "./actions/recording-download-get.ts";
import teamGetMany from "./actions/team-get-many.ts";
import teamMemberGetMany from "./actions/team-member-get-many.ts";
import userGetMany from "./actions/user-get-many.ts";
import webhookCreate from "./actions/webhook-create.ts";
import webhookDelete from "./actions/webhook-delete.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // meeting
    meetingGetMany,
    meetingTypeGetMany,
    // recording
    recordingGetSummary,
    recordingGetTranscript,
    recordingDownloadRequest,
    recordingDownloadGet,
    // directory
    teamGetMany,
    teamMemberGetMany,
    userGetMany,
    // webhook
    webhookCreate,
    webhookDelete,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
