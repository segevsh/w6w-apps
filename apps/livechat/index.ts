/**
 * LiveChat (by Text) — live chat for customer support and sales: chats, threads and messages,
 * customers, agents, groups, tags and routing status, over the Agent Chat Web API and the
 * Configuration API, both v3.6 at `api.livechatinc.com`.
 *
 * Every method and parameter here comes from the vendor's reference at
 * `https://platform.text.com/docs/messaging/agent-chat-api` and
 * `https://platform.text.com/docs/management/configuration-api`, checked 2026-10-06. The README
 * lists what is deliberately not covered.
 */
import type { AppDefinition } from "@w6w/types";
import listChats from "./actions/list-chats.ts";
import listThreads from "./actions/list-threads.ts";
import getChat from "./actions/get-chat.ts";
import listArchives from "./actions/list-archives.ts";
import startChat from "./actions/start-chat.ts";
import deactivateChat from "./actions/deactivate-chat.ts";
import transferChat from "./actions/transfer-chat.ts";
import sendEvent from "./actions/send-event.ts";
import tagThread from "./actions/tag-thread.ts";
import untagThread from "./actions/untag-thread.ts";
import getCustomer from "./actions/get-customer.ts";
import updateCustomer from "./actions/update-customer.ts";
import listRoutingStatuses from "./actions/list-routing-statuses.ts";
import setRoutingStatus from "./actions/set-routing-status.ts";
import listAgents from "./actions/list-agents.ts";
import getAgent from "./actions/get-agent.ts";
import listGroups from "./actions/list-groups.ts";
import getGroup from "./actions/get-group.ts";
import listTags from "./actions/list-tags.ts";
import createTag from "./actions/create-tag.ts";
import deleteTag from "./actions/delete-tag.ts";
import listChannels from "./actions/list-channels.ts";
import personalAccessToken from "./auth/personal-access-token.ts";
import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

const app: AppDefinition = {
  actions: [
    listChats,
    listThreads,
    getChat,
    listArchives,
    startChat,
    deactivateChat,
    transferChat,
    sendEvent,
    tagThread,
    untagThread,
    getCustomer,
    updateCustomer,
    listRoutingStatuses,
    setRoutingStatus,
    listAgents,
    getAgent,
    listGroups,
    getGroup,
    listTags,
    createTag,
    deleteTag,
    listChannels,
  ],
  auth: [personalAccessToken],
  healthChecks: [service, api, quota],
};

export default app;
