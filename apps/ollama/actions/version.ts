import type { ActionDefinition } from "@w6w/types";
import { OllamaClient } from "../lib/client.ts";

/**
 * `GET /api/version` — the server's Ollama version.
 *
 * Also the cheapest "is it up" call there is: it loads no model and lists
 * nothing. The connection test and the `instance` health check use the same
 * endpoint. Newer features (thinking, tools, structured output) arrive in
 * particular releases, so this is how a workflow checks before relying on one.
 */
const action: ActionDefinition = {
  key: "version",
  type: "read",
  resource: "server",
  title: "Get server version",
  description: "The version of the Ollama server this connection points at.",
  params: [],
  output: [{ key: "version", type: "string", label: "The Ollama version, e.g. 0.34.1" }],

  async execute(_input, ctx) {
    const r = await new OllamaClient(ctx).request<{ version?: string }>("/api/version");
    return { version: r?.version };
  },
};

export default action;
