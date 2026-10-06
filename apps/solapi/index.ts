/**
 * SOLAPI (솔라피) — Korean SMS, LMS, MMS and Kakao AlimTalk messaging, over the REST API at
 * `api.solapi.com`.
 *
 * Every path, verb, parameter and enum here was verified on 2026-10-06 against SOLAPI's own
 * developer reference (solapi.com/developers/api/*) plus live probes of the host. SOLAPI publishes
 * no OpenAPI document; the reference pages are server-rendered HTML.
 *
 * Findings that shaped the design (details where they matter, and in the README):
 *
 *  1. **HMAC-SHA256 header** (`auth/api-key.ts`): `Authorization: HMAC-SHA256 apiKey=…, date=…,
 *     salt=…, signature=…`, the signature being hex HMAC of `date + salt` keyed by the secret.
 *     Built in `sign`; the secret never reaches an action or the wire.
 *  2. **No success envelope, keyed-object lists** (`lib/client.ts`): a 2xx body is the resource;
 *     failures are `{errorCode, errorMessage}`; message and group lists are objects keyed by id.
 *  3. **A 200 send can still have sent nothing**: messages SOLAPI refused sit in
 *     `failedMessageList`, so send actions surface `failedCount`.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";
import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

import sendMessage from "./actions/send-message.ts";
import sendMessages from "./actions/send-messages.ts";
import sendAlimtalk from "./actions/send-alimtalk.ts";
import listMessages from "./actions/list-messages.ts";
import listGroups from "./actions/list-groups.ts";
import getGroup from "./actions/get-group.ts";
import listGroupMessages from "./actions/list-group-messages.ts";
import createGroup from "./actions/create-group.ts";
import addGroupMessages from "./actions/add-group-messages.ts";
import sendGroup from "./actions/send-group.ts";
import scheduleGroup from "./actions/schedule-group.ts";
import cancelGroupSchedule from "./actions/cancel-group-schedule.ts";
import deleteGroup from "./actions/delete-group.ts";
import getBalance from "./actions/get-balance.ts";
import listSenderNumbers from "./actions/list-sender-numbers.ts";
import listActiveSenderNumbers from "./actions/list-active-sender-numbers.ts";
import getStatistics from "./actions/get-statistics.ts";
import listFiles from "./actions/list-files.ts";
import listKakaoChannels from "./actions/list-kakao-channels.ts";
import getKakaoChannel from "./actions/get-kakao-channel.ts";
import listKakaoTemplates from "./actions/list-kakao-templates.ts";
import getKakaoTemplate from "./actions/get-kakao-template.ts";

export default {
  actions: [
    sendMessage,
    sendMessages,
    sendAlimtalk,
    listMessages,
    listGroups,
    getGroup,
    listGroupMessages,
    createGroup,
    addGroupMessages,
    sendGroup,
    scheduleGroup,
    cancelGroupSchedule,
    deleteGroup,
    getBalance,
    listSenderNumbers,
    listActiveSenderNumbers,
    getStatistics,
    listFiles,
    listKakaoChannels,
    getKakaoChannel,
    listKakaoTemplates,
    getKakaoTemplate,
  ],
  auth: [apiKey],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
