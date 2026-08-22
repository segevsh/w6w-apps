/**
 * Ashby — work a hiring pipeline: find and create candidates, move
 * applications through stages, read interviews, feedback and offers, and sync
 * the whole thing incrementally.
 *
 * See `lib/client.ts` for the three conventions that shape every action here —
 * an error arriving as `200 OK` with `success: false`, everything being POST,
 * and the verb in each endpoint's name — and `README.md` for the distinctions
 * that decide whether a workflow built on it is correct.
 */
import type { AppDefinition } from "@w6w/types";

import apiKey from "./auth/api-key.ts";

import service from "./health/service.ts";
import permissions from "./health/permissions.ts";
import quota from "./health/quota.ts";

import candidateSearch from "./actions/candidate-search.ts";
import candidateList from "./actions/candidate-list.ts";
import candidateGet from "./actions/candidate-get.ts";
import candidateCreate from "./actions/candidate-create.ts";
import candidateUpdate from "./actions/candidate-update.ts";
import candidateNoteCreate from "./actions/candidate-note-create.ts";
import candidateNoteList from "./actions/candidate-note-list.ts";
import applicationList from "./actions/application-list.ts";
import applicationGet from "./actions/application-get.ts";
import applicationChangeStage from "./actions/application-change-stage.ts";
import applicationUpdate from "./actions/application-update.ts";
import applicationFeedbackList from "./actions/application-feedback-list.ts";
import jobList from "./actions/job-list.ts";
import jobGet from "./actions/job-get.ts";
import jobPostingList from "./actions/job-posting-list.ts";
import jobPostingGet from "./actions/job-posting-get.ts";
import interviewScheduleList from "./actions/interview-schedule-list.ts";
import interviewEventList from "./actions/interview-event-list.ts";
import interviewStageList from "./actions/interview-stage-list.ts";
import offerList from "./actions/offer-list.ts";
import offerGet from "./actions/offer-get.ts";
import userList from "./actions/user-list.ts";
import departmentList from "./actions/department-list.ts";
import locationList from "./actions/location-list.ts";
import sourceList from "./actions/source-list.ts";
import archiveReasonList from "./actions/archive-reason-list.ts";
import apiKeyInfo from "./actions/api-key-info.ts";

const app: AppDefinition = {
  actions: [
    candidateSearch,
    candidateList,
    candidateGet,
    candidateCreate,
    candidateUpdate,
    candidateNoteCreate,
    candidateNoteList,
    applicationList,
    applicationGet,
    applicationChangeStage,
    applicationUpdate,
    applicationFeedbackList,
    jobList,
    jobGet,
    jobPostingList,
    jobPostingGet,
    interviewScheduleList,
    interviewEventList,
    interviewStageList,
    offerList,
    offerGet,
    userList,
    departmentList,
    locationList,
    sourceList,
    archiveReasonList,
    apiKeyInfo,
  ],
  auth: [apiKey],
  healthChecks: [service, permissions, quota],
};

export default app;
