import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";
import chatCompletion from "./actions/chat-completion.ts";
import agentResponse from "./actions/agent-response.ts";
import webSearch from "./actions/web-search.ts";
import createEmbeddings from "./actions/create-embeddings.ts";
import listModels from "./actions/list-models.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    agentResponse,
    chatCompletion,
    webSearch,
    createEmbeddings,
    listModels,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
