import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";
import generateContent from "./actions/generate-content.ts";
import countTokens from "./actions/count-tokens.ts";
import embedContent from "./actions/embed-content.ts";
import batchEmbedContents from "./actions/batch-embed-contents.ts";
import listModels from "./actions/list-models.ts";
import getModel from "./actions/get-model.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    generateContent,
    countTokens,
    embedContent,
    batchEmbedContents,
    listModels,
    getModel,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
