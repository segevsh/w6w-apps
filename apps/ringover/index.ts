import type { AppDefinition } from "@w6w/types";
import blacklistList from "./actions/blacklist-list.ts";
import callGet from "./actions/call-get.ts";
import callList from "./actions/call-list.ts";
import callLiveList from "./actions/call-live-list.ts";
import callSearch from "./actions/call-search.ts";
import callbackCreate from "./actions/callback-create.ts";
import contactCreate from "./actions/contact-create.ts";
import contactDelete from "./actions/contact-delete.ts";
import contactGet from "./actions/contact-get.ts";
import contactList from "./actions/contact-list.ts";
import contactNumberAdd from "./actions/contact-number-add.ts";
import contactNumberDelete from "./actions/contact-number-delete.ts";
import contactUpdate from "./actions/contact-update.ts";
import conversationGet from "./actions/conversation-get.ts";
import conversationList from "./actions/conversation-list.ts";
import groupGet from "./actions/group-get.ts";
import groupList from "./actions/group-list.ts";
import messageList from "./actions/message-list.ts";
import numberGet from "./actions/number-get.ts";
import numberList from "./actions/number-list.ts";
import smsOptIn from "./actions/sms-opt-in.ts";
import smsOptOut from "./actions/sms-opt-out.ts";
import smsSend from "./actions/sms-send.ts";
import tagCreate from "./actions/tag-create.ts";
import tagList from "./actions/tag-list.ts";
import teamGet from "./actions/team-get.ts";
import transcriptionGet from "./actions/transcription-get.ts";
import userGet from "./actions/user-get.ts";
import userList from "./actions/user-list.ts";
import userPresenceGet from "./actions/user-presence-get.ts";
import apiKey from "./auth/api-key.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";
import service from "./health/service.ts";

export default {
  actions: [
    blacklistList,
    callGet,
    callList,
    callLiveList,
    callSearch,
    callbackCreate,
    contactCreate,
    contactDelete,
    contactGet,
    contactList,
    contactNumberAdd,
    contactNumberDelete,
    contactUpdate,
    conversationGet,
    conversationList,
    groupGet,
    groupList,
    messageList,
    numberGet,
    numberList,
    smsOptIn,
    smsOptOut,
    smsSend,
    tagCreate,
    tagList,
    teamGet,
    transcriptionGet,
    userGet,
    userList,
    userPresenceGet,
  ],
  auth: [apiKey],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
