/**
 * Ollama Cloud — run prompts, chats and embeddings against Ollama's hosted
 * service with an API key.
 *
 * Unlike `io.w6w.ollama`, there is no server address to collect: the base URL is
 * the vendor's own origin (`https://ollama.com`, see `lib/client.ts`) and the
 * only connection field is the API key (`auth/api-key.ts`). Everything is
 * non-streaming (`stream: false`), and nothing here manages models — pulling,
 * copying, deleting or unloading is neither exposed by the cloud API nor part of
 * this app.
 */
import type { AppDefinition } from "@w6w/types";

import apiKey from "./auth/api-key.ts";

import service from "./health/service.ts";
import instance from "./health/instance.ts";
import quota from "./health/quota.ts";

import generate from "./actions/generate.ts";
import chat from "./actions/chat.ts";
import embed from "./actions/embed.ts";
import modelList from "./actions/model-list.ts";
import version from "./actions/version.ts";

const app: AppDefinition = {
  actions: [
    generate,
    chat,
    embed,
    modelList,
    version,
  ],
  auth: [apiKey],
  healthChecks: [service, instance, quota],
};

export default app;
