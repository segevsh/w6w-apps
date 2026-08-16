import type { ActionDefinition } from "@w6w/types";
import { PerplexityClient } from "../lib/client.ts";

/**
 * GET /v1/models — the model catalog for the **Agent API** (`POST /v1/agent`,
 * not modeled by this app — see the README), in OpenAI's list-models shape.
 * It does not list the Sonar chat-completion models (`sonar`, `sonar-pro`,
 * `sonar-reasoning-pro`, `sonar-deep-research`) used by `chat-completion.ts` —
 * those are a fixed enum published in the OpenAPI spec, not a queryable list.
 *
 * The OpenAPI document declares this route `security: []`; the live API
 * disagrees and 401s without a valid key exactly like every other endpoint
 * (measured 2026-08-16 — see `auth/api-key.ts`), so it still requires
 * `requiresAuth`.
 */
const listModels: ActionDefinition<Record<string, never>> = {
  key: "list-models",
  type: "read",
  resource: "model",
  title: "List Agent API Models",
  description: "List the third-party and Perplexity models available through the Agent API " +
    "(POST /v1/agent). Does not include the Sonar chat-completion models.",
  params: [],
  output: [
    { key: "data", type: "array", label: "Models" },
  ],

  execute(_input, ctx) {
    const client = new PerplexityClient(ctx);
    return client.request("/v1/models");
  },
};

export default listModels;
