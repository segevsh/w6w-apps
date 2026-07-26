import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";
import chatCompletion from "./actions/chat-completion.ts";
import embeddings from "./actions/embeddings.ts";
import extractText from "./actions/extract-text.ts";
import listModels from "./actions/list-models.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    chatCompletion,
    embeddings,
    extractText,
    listModels,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
