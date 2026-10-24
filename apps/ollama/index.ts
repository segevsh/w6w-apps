/**
 * Ollama — run prompts, chats and embeddings against a local or self-hosted
 * Ollama server, and manage the models on it.
 *
 * The server is the user's own, so the connection IS its address: host, port and
 * scheme are collected when the app is connected and every request is built from
 * them by `lib/client.ts`. The thing to know before anything else is that the
 * address has to be reachable from wherever workflows run — see
 * `auth/server.ts`. Everything is non-streaming (`stream: false`).
 */
import type { AppDefinition } from "@w6w/types";

import server from "./auth/server.ts";

import service from "./health/service.ts";
import instance from "./health/instance.ts";
import quota from "./health/quota.ts";

import generate from "./actions/generate.ts";
import chat from "./actions/chat.ts";
import embed from "./actions/embed.ts";
import modelList from "./actions/model-list.ts";
import modelShow from "./actions/model-show.ts";
import modelRunning from "./actions/model-running.ts";
import modelPull from "./actions/model-pull.ts";
import modelDelete from "./actions/model-delete.ts";
import modelCopy from "./actions/model-copy.ts";
import modelUnload from "./actions/model-unload.ts";
import version from "./actions/version.ts";

const app: AppDefinition = {
  actions: [
    generate,
    chat,
    embed,
    modelList,
    modelShow,
    modelRunning,
    modelPull,
    modelDelete,
    modelCopy,
    modelUnload,
    version,
  ],
  auth: [server],
  healthChecks: [service, instance, quota],
};

export default app;
