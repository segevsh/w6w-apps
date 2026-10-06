import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";
import chatComplete from "./actions/chat-complete.ts";
import createResponse from "./actions/create-response.ts";
import createMessage from "./actions/create-message.ts";
import getResponse from "./actions/get-response.ts";
import deleteResponse from "./actions/delete-response.ts";
import listModels from "./actions/list-models.ts";
import getModel from "./actions/get-model.ts";
import listLanguageModels from "./actions/list-language-models.ts";
import createEmbedding from "./actions/create-embedding.ts";
import generateImage from "./actions/generate-image.ts";
import tokenizeText from "./actions/tokenize-text.ts";
import listFiles from "./actions/list-files.ts";
import getFile from "./actions/get-file.ts";
import deleteFile from "./actions/delete-file.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    chatComplete,
    createResponse,
    createMessage,
    getResponse,
    deleteResponse,
    listModels,
    getModel,
    listLanguageModels,
    createEmbedding,
    generateImage,
    tokenizeText,
    listFiles,
    getFile,
    deleteFile,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
