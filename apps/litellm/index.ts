import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

/**
 * No sandboxed actions: a LiteLLM connection is only ever used by the host's model layer
 * (`@w6w/model` routes, Functions, agents), which reaches the embedded proxy itself —
 * `packages/server/packages/bll/model-litellm.ts`.
 */
export default {
  actions: [],
  auth: [apiKey],
} satisfies AppDefinition;
