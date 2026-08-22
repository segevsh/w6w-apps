/**
 * Deepgram — transcribe audio and video by URL, analyse text for sentiment,
 * topics and intent, generate speech, and watch the spend and request history
 * behind it.
 *
 * See `lib/client.ts` for what shapes the app: Deepgram fetches media itself
 * rather than taking an upload, long jobs and all text-to-speech go through a
 * callback, and its three services report errors in three different shapes.
 */
import type { AppDefinition } from "@w6w/types";

import apiKey from "./auth/api-key.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";
import concurrency from "./health/concurrency.ts";

import audioTranscribe from "./actions/audio-transcribe.ts";
import textAnalyze from "./actions/text-analyze.ts";
import speechGenerate from "./actions/speech-generate.ts";
import tokenGrant from "./actions/token-grant.ts";
import modelList from "./actions/model-list.ts";
import projectList from "./actions/project-list.ts";
import projectGet from "./actions/project-get.ts";
import usageGet from "./actions/usage-get.ts";
import usageBreakdownGet from "./actions/usage-breakdown-get.ts";
import usageFieldsList from "./actions/usage-fields-list.ts";
import requestList from "./actions/request-list.ts";
import requestGet from "./actions/request-get.ts";
import balanceList from "./actions/balance-list.ts";
import keyList from "./actions/key-list.ts";
import keyCreate from "./actions/key-create.ts";
import keyDelete from "./actions/key-delete.ts";
import memberList from "./actions/member-list.ts";
import memberScopeList from "./actions/member-scope-list.ts";
import inviteList from "./actions/invite-list.ts";

const app: AppDefinition = {
  actions: [
    audioTranscribe,
    textAnalyze,
    speechGenerate,
    tokenGrant,
    modelList,
    projectList,
    projectGet,
    usageGet,
    usageBreakdownGet,
    usageFieldsList,
    requestList,
    requestGet,
    balanceList,
    keyList,
    keyCreate,
    keyDelete,
    memberList,
    memberScopeList,
    inviteList,
  ],
  auth: [apiKey],
  healthChecks: [service, quota, concurrency],
};

export default app;
