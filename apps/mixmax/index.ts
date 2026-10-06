import type { AppDefinition } from "@w6w/types";
import userGet from "./actions/user-get.ts";
import messageList from "./actions/message-list.ts";
import messageGet from "./actions/message-get.ts";
import messageCreate from "./actions/message-create.ts";
import messageSend from "./actions/message-send.ts";
import sequenceList from "./actions/sequence-list.ts";
import sequenceSearch from "./actions/sequence-search.ts";
import sequenceRecipientList from "./actions/sequence-recipient-list.ts";
import sequenceRecipientAdd from "./actions/sequence-recipient-add.ts";
import sequenceCancel from "./actions/sequence-cancel.ts";
import sequenceFolderList from "./actions/sequence-folder-list.ts";
import templateList from "./actions/template-list.ts";
import templateGet from "./actions/template-get.ts";
import taskList from "./actions/task-list.ts";
import teamList from "./actions/team-list.ts";
import teamGet from "./actions/team-get.ts";
import teamMemberList from "./actions/team-member-list.ts";
import unsubscribeList from "./actions/unsubscribe-list.ts";
import unsubscribeAdd from "./actions/unsubscribe-add.ts";
import unsubscribeRemove from "./actions/unsubscribe-remove.ts";
import apiToken from "./auth/api-token.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";
import service from "./health/service.ts";

export default {
  actions: [
    userGet,
    messageList,
    messageGet,
    messageCreate,
    messageSend,
    sequenceList,
    sequenceSearch,
    sequenceRecipientList,
    sequenceRecipientAdd,
    sequenceCancel,
    sequenceFolderList,
    templateList,
    templateGet,
    taskList,
    teamList,
    teamGet,
    teamMemberList,
    unsubscribeList,
    unsubscribeAdd,
    unsubscribeRemove,
  ],
  auth: [apiToken],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
