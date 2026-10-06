import type { ActionDefinition } from "@w6w/types";
import { SkyvernClient } from "../lib/client.ts";

/** `GET /v1/browser_sessions` — active browser sessions. The endpoint takes no paging. */
type Input = Record<string, never>;

const browserSessionList: ActionDefinition<Input> = {
  key: "browser-session-list",
  type: "read",
  resource: "browser-session",
  title: "List Browser Sessions",
  description: "List the account's active browser sessions.",
  params: [],
  output: [
    { key: "browser_sessions", type: "array", label: "Browser sessions" },
    { key: "count", type: "number", label: "Count" },
  ],

  async execute(_input, ctx) {
    const sessions = await new SkyvernClient(ctx).json<unknown[]>("/v1/browser_sessions");
    return { browser_sessions: sessions ?? [], count: (sessions ?? []).length };
  },
};

export default browserSessionList;
