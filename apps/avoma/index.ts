/**
 * Avoma — AI meeting assistant: recordings, transcripts, notes, scorecards and calls.
 *
 * REST over `https://api.avoma.com/v1`, bearer-token auth. Built from Avoma's own OpenAPI
 * document (`dev.avoma.com/openapi.yml`, 43 paths) and live unauthenticated probes on
 * 2026-10-06. Things that shape the code:
 *
 *   - **Dates are mandatory.** `from_date` / `to_date` are REQUIRED on meetings, notes,
 *     calls and transcriptions (the overview prose says otherwise); the list actions enforce
 *     it before the request so the failure is readable.
 *   - **Paging is by `next` URL.** Only transcriptions and snippets document `page`; list
 *     actions take the previous page's `next` and follow it on the API origin only.
 *   - **Trailing slashes are part of the path** (`/v1/meetings/`).
 *   - **A bad key is a 401 with a body** — `{"detail":"Invalid Token"}` — so verdicts are read
 *     from the body, and the unsigned reachability check treats that 401 as a pass.
 *   - **No status page, no rate-limit headers** — both declared as informational absences.
 *
 * Deliberately absent (see README): meeting types/outcomes, templates, custom categories,
 * smart-category writes, snippets, engagement and revenue-intel reports, call update, and the
 * webhook surface.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import callCreate from "./actions/call-create.ts";
import callGet from "./actions/call-get.ts";
import callList from "./actions/call-list.ts";
import meetingDrop from "./actions/meeting-drop.ts";
import meetingGet from "./actions/meeting-get.ts";
import meetingInsightsGet from "./actions/meeting-insights-get.ts";
import meetingList from "./actions/meeting-list.ts";
import meetingSegmentList from "./actions/meeting-segment-list.ts";
import meetingSentimentList from "./actions/meeting-sentiment-list.ts";
import noteList from "./actions/note-list.ts";
import recordingGet from "./actions/recording-get.ts";
import scorecardEvaluationList from "./actions/scorecard-evaluation-list.ts";
import scorecardGet from "./actions/scorecard-get.ts";
import scorecardList from "./actions/scorecard-list.ts";
import smartCategoryList from "./actions/smart-category-list.ts";
import transcriptionGet from "./actions/transcription-get.ts";
import transcriptionList from "./actions/transcription-list.ts";
import userGet from "./actions/user-get.ts";
import userList from "./actions/user-list.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    meetingList,
    meetingGet,
    meetingInsightsGet,
    meetingSegmentList,
    meetingSentimentList,
    meetingDrop,
    transcriptionList,
    transcriptionGet,
    recordingGet,
    noteList,
    smartCategoryList,
    userList,
    userGet,
    callList,
    callGet,
    callCreate,
    scorecardList,
    scorecardGet,
    scorecardEvaluationList,
  ],
  auth: [apiKey],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
