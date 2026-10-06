import type { ActionDefinition } from "@w6w/types";
import { SkyvernClient } from "../lib/client.ts";
import { sessionIdParam } from "../lib/params.ts";

/** `POST /v1/browser_sessions/{browser_session_id}/close` — 404 if unknown. The 200 body is unspecified. */
interface Input {
  browserSessionId: string;
}

const browserSessionClose: ActionDefinition<Input> = {
  key: "browser-session-close",
  type: "perform",
  resource: "browser-session",
  title: "Close Browser Session",
  description: "Close a browser session so it stops billing; `completed_at` is set when it ends.",
  idempotent: true,
  params: [sessionIdParam],
  output: [
    { key: "success", type: "boolean", label: "Close request accepted" },
    { key: "browser_session_id", type: "string", label: "Browser session ID" },
  ],

  async execute(input, ctx) {
    await new SkyvernClient(ctx).json(
      `/v1/browser_sessions/${encodeURIComponent(input.browserSessionId)}/close`,
      { method: "POST" },
    );
    return { success: true, browser_session_id: input.browserSessionId };
  },
};

export default browserSessionClose;
