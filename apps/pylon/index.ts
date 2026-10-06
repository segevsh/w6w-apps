import type { AppDefinition } from "@w6w/types";
import accountCreate from "./actions/account-create.ts";
import accountGet from "./actions/account-get.ts";
import accountList from "./actions/account-list.ts";
import accountSearch from "./actions/account-search.ts";
import accountUpdate from "./actions/account-update.ts";
import contactCreate from "./actions/contact-create.ts";
import contactGet from "./actions/contact-get.ts";
import contactList from "./actions/contact-list.ts";
import contactSearch from "./actions/contact-search.ts";
import contactUpdate from "./actions/contact-update.ts";
import issueCreate from "./actions/issue-create.ts";
import issueGet from "./actions/issue-get.ts";
import issueList from "./actions/issue-list.ts";
import issueNoteCreate from "./actions/issue-note-create.ts";
import issueReply from "./actions/issue-reply.ts";
import issueSearch from "./actions/issue-search.ts";
import issueSnooze from "./actions/issue-snooze.ts";
import issueStatusList from "./actions/issue-status-list.ts";
import issueThreadList from "./actions/issue-thread-list.ts";
import issueUpdate from "./actions/issue-update.ts";
import meGet from "./actions/me-get.ts";
import messageList from "./actions/message-list.ts";
import tagCreate from "./actions/tag-create.ts";
import tagList from "./actions/tag-list.ts";
import tagUpdate from "./actions/tag-update.ts";
import teamGet from "./actions/team-get.ts";
import teamList from "./actions/team-list.ts";
import userGet from "./actions/user-get.ts";
import userList from "./actions/user-list.ts";
import userSearch from "./actions/user-search.ts";
import apiToken from "./auth/api-token.ts";
import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    accountCreate,
    accountGet,
    accountList,
    accountSearch,
    accountUpdate,
    contactCreate,
    contactGet,
    contactList,
    contactSearch,
    contactUpdate,
    issueCreate,
    issueGet,
    issueList,
    issueNoteCreate,
    issueReply,
    issueSearch,
    issueSnooze,
    issueStatusList,
    issueThreadList,
    issueUpdate,
    meGet,
    messageList,
    tagCreate,
    tagList,
    tagUpdate,
    teamGet,
    teamList,
    userGet,
    userList,
    userSearch,
  ],
  auth: [apiToken],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
