import type { AppDefinition } from "@w6w/types";
import basic from "./auth/basic.ts";
import sendMessage from "./actions/send-message.ts";
import getMessage from "./actions/get-message.ts";
import listMessages from "./actions/list-messages.ts";
import listMessageMedia from "./actions/list-message-media.ts";
import makeCall from "./actions/make-call.ts";
import getCall from "./actions/get-call.ts";
import listCalls from "./actions/list-calls.ts";
import listLiveCalls from "./actions/list-live-calls.ts";
import hangupCall from "./actions/hangup-call.ts";
import cancelCallRequest from "./actions/cancel-call-request.ts";
import listRecordings from "./actions/list-recordings.ts";
import getRecording from "./actions/get-recording.ts";
import searchPhoneNumbers from "./actions/search-phone-numbers.ts";
import buyPhoneNumber from "./actions/buy-phone-number.ts";
import listNumbers from "./actions/list-numbers.ts";
import getNumber from "./actions/get-number.ts";
import updateNumber from "./actions/update-number.ts";
import getAccount from "./actions/get-account.ts";
import listApplications from "./actions/list-applications.ts";
import getApplication from "./actions/get-application.ts";
import createApplication from "./actions/create-application.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    sendMessage,
    getMessage,
    listMessages,
    listMessageMedia,
    makeCall,
    getCall,
    listCalls,
    listLiveCalls,
    hangupCall,
    cancelCallRequest,
    listRecordings,
    getRecording,
    searchPhoneNumbers,
    buyPhoneNumber,
    listNumbers,
    getNumber,
    updateNumber,
    getAccount,
    listApplications,
    getApplication,
    createApplication,
  ],
  auth: [basic],
  healthChecks: [service, quota],
} satisfies AppDefinition;
