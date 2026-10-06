import type { AppDefinition } from "@w6w/types";
import apiToken from "./auth/api-token.ts";

import agentGet from "./actions/agent-get.ts";
import agentList from "./actions/agent-list.ts";
import conversationAssign from "./actions/conversation-assign.ts";
import conversationClose from "./actions/conversation-close.ts";
import conversationCreateEmail from "./actions/conversation-create-email.ts";
import conversationCustomAttributesUpdate from "./actions/conversation-custom-attributes-update.ts";
import conversationGet from "./actions/conversation-get.ts";
import conversationListByEndUser from "./actions/conversation-list-by-end-user.ts";
import conversationReopen from "./actions/conversation-reopen.ts";
import conversationSearch from "./actions/conversation-search.ts";
import conversationTagAdd from "./actions/conversation-tag-add.ts";
import conversationTagList from "./actions/conversation-tag-list.ts";
import conversationTagRemove from "./actions/conversation-tag-remove.ts";
import conversationTransferQueue from "./actions/conversation-transfer-queue.ts";
import customAttributeList from "./actions/custom-attribute-list.ts";
import endUserCreate from "./actions/end-user-create.ts";
import endUserCustomAttributesUpdate from "./actions/end-user-custom-attributes-update.ts";
import endUserGet from "./actions/end-user-get.ts";
import endUserList from "./actions/end-user-list.ts";
import endUserUpdate from "./actions/end-user-update.ts";
import messageAdd from "./actions/message-add.ts";
import messageList from "./actions/message-list.ts";
import noteAdd from "./actions/note-add.ts";
import noteList from "./actions/note-list.ts";
import queueGet from "./actions/queue-get.ts";
import queueList from "./actions/queue-list.ts";
import tagCreate from "./actions/tag-create.ts";
import tagList from "./actions/tag-list.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

/**
 * Dixa — customer-service conversations, end users, agents, tags and queues, over the v1 REST API
 * at `dev.dixa.io`. Every path, verb, parameter and body field was read off Dixa's own OpenAPI
 * document (`docs.dixa.io/_bundle/openapi/dixa-api/@v1/v1.yaml`) on 2026-10-06; see `lib/client.ts`
 * for the cross-cutting shapes (raw-token auth, `{data, meta}` envelopes, opaque `pageKey`,
 * `_type` discriminators, 204s).
 */
export default {
  actions: [
    agentGet,
    agentList,
    conversationAssign,
    conversationClose,
    conversationCreateEmail,
    conversationCustomAttributesUpdate,
    conversationGet,
    conversationListByEndUser,
    conversationReopen,
    conversationSearch,
    conversationTagAdd,
    conversationTagList,
    conversationTagRemove,
    conversationTransferQueue,
    customAttributeList,
    endUserCreate,
    endUserCustomAttributesUpdate,
    endUserGet,
    endUserList,
    endUserUpdate,
    messageAdd,
    messageList,
    noteAdd,
    noteList,
    queueGet,
    queueList,
    tagCreate,
    tagList,
  ],
  auth: [apiToken],
  healthChecks: [service, quota],
} satisfies AppDefinition;
