/**
 * Aidbase — AI support agents. Knowledge sources, chatbots, email inboxes and ticket forms,
 * over the Aidbase REST API (`api.aidbase.ai/v1`).
 *
 * Every path, verb, parameter and enum here was verified on 2026-10-06 against Aidbase's own
 * API reference (docs.aidbase.ai/apis/{knowledge,chatbot,email-inbox,ticket-form}-api/reference)
 * plus live probes of the host. Aidbase publishes no OpenAPI document.
 *
 * Findings that shaped the design (details where they matter, and in the README):
 *
 *  1. **Missing and invalid keys are told apart only by `message`** (`auth/api-key.ts`): both
 *     are `401 {"success":false,"message":…}`; the verdict is a `data.status === "ok"` body.
 *  2. **Envelope** (`lib/client.ts`): every body is `{ success, data }`, and `success: false`
 *     is a failure whatever the status. Lists are cursor-paged (`limit`, `next_cursor`) except
 *     the three account-level lists (chatbots, inboxes, forms), which are bare arrays.
 *  3. **Scopes are per write endpoint** (CHATBOTS_WRITE, EMAILINBOXES_WRITE, TICKETFORMS_WRITE,
 *     EMAILS_WRITE, TICKETS_WRITE), so a 403 usually means the key lacks one.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";
import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

import accountStatus from "./actions/account-status.ts";
import knowledgeList from "./actions/knowledge-list.ts";
import knowledgeGet from "./actions/knowledge-get.ts";
import knowledgeSubPageList from "./actions/knowledge-sub-page-list.ts";
import knowledgeFaqItemList from "./actions/knowledge-faq-item-list.ts";
import knowledgeWebsiteCreate from "./actions/knowledge-website-create.ts";
import knowledgeVideoCreate from "./actions/knowledge-video-create.ts";
import knowledgeDocumentCreate from "./actions/knowledge-document-create.ts";
import knowledgeDocumentFinalize from "./actions/knowledge-document-finalize.ts";
import knowledgeFaqCreate from "./actions/knowledge-faq-create.ts";
import knowledgeFaqItemCreate from "./actions/knowledge-faq-item-create.ts";
import knowledgeDelete from "./actions/knowledge-delete.ts";
import knowledgeFaqItemDelete from "./actions/knowledge-faq-item-delete.ts";
import knowledgeTrain from "./actions/knowledge-train.ts";
import chatbotList from "./actions/chatbot-list.ts";
import chatbotGet from "./actions/chatbot-get.ts";
import chatbotKnowledgeList from "./actions/chatbot-knowledge-list.ts";
import chatbotKnowledgeAdd from "./actions/chatbot-knowledge-add.ts";
import chatbotKnowledgeRemove from "./actions/chatbot-knowledge-remove.ts";
import emailInboxList from "./actions/email-inbox-list.ts";
import emailInboxGet from "./actions/email-inbox-get.ts";
import emailInboxKnowledgeList from "./actions/email-inbox-knowledge-list.ts";
import emailInboxKnowledgeAdd from "./actions/email-inbox-knowledge-add.ts";
import emailInboxKnowledgeRemove from "./actions/email-inbox-knowledge-remove.ts";
import ticketFormList from "./actions/ticket-form-list.ts";
import ticketFormGet from "./actions/ticket-form-get.ts";
import ticketFormKnowledgeList from "./actions/ticket-form-knowledge-list.ts";
import ticketFormKnowledgeAdd from "./actions/ticket-form-knowledge-add.ts";
import ticketFormKnowledgeRemove from "./actions/ticket-form-knowledge-remove.ts";
import chatbotReply from "./actions/chatbot-reply.ts";
import chatbotChatList from "./actions/chatbot-chat-list.ts";
import chatbotChatGet from "./actions/chatbot-chat-get.ts";
import chatbotChatBlock from "./actions/chatbot-chat-block.ts";
import emailList from "./actions/email-list.ts";
import emailGet from "./actions/email-get.ts";
import emailBlock from "./actions/email-block.ts";
import emailUpdate from "./actions/email-update.ts";
import emailReply from "./actions/email-reply.ts";
import ticketList from "./actions/ticket-list.ts";
import ticketGet from "./actions/ticket-get.ts";
import ticketBlock from "./actions/ticket-block.ts";
import ticketUpdate from "./actions/ticket-update.ts";
import ticketReply from "./actions/ticket-reply.ts";

export default {
  actions: [
    accountStatus,
    knowledgeList,
    knowledgeGet,
    knowledgeSubPageList,
    knowledgeFaqItemList,
    knowledgeWebsiteCreate,
    knowledgeVideoCreate,
    knowledgeDocumentCreate,
    knowledgeDocumentFinalize,
    knowledgeFaqCreate,
    knowledgeFaqItemCreate,
    knowledgeDelete,
    knowledgeFaqItemDelete,
    knowledgeTrain,
    chatbotList,
    chatbotGet,
    chatbotKnowledgeList,
    chatbotKnowledgeAdd,
    chatbotKnowledgeRemove,
    emailInboxList,
    emailInboxGet,
    emailInboxKnowledgeList,
    emailInboxKnowledgeAdd,
    emailInboxKnowledgeRemove,
    ticketFormList,
    ticketFormGet,
    ticketFormKnowledgeList,
    ticketFormKnowledgeAdd,
    ticketFormKnowledgeRemove,
    chatbotReply,
    chatbotChatList,
    chatbotChatGet,
    chatbotChatBlock,
    emailList,
    emailGet,
    emailBlock,
    emailUpdate,
    emailReply,
    ticketList,
    ticketGet,
    ticketBlock,
    ticketUpdate,
    ticketReply,
  ],
  auth: [apiKey],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
