import type { ActionDefinition } from "@w6w/types";
import { SkyvernClient } from "../lib/client.ts";
import { sessionIdParam } from "../lib/params.ts";

/** `GET /v1/browser_sessions/{browser_session_id}` */
interface Input {
  browserSessionId: string;
}

const browserSessionGet: ActionDefinition<Input> = {
  key: "browser-session-get",
  type: "read",
  resource: "browser-session",
  title: "Get Browser Session",
  description: "Fetch a browser session: status, address, downloaded files and recordings.",
  params: [sessionIdParam],
  output: [
    { key: "browser_session_id", type: "string", label: "Browser session ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "browser_address", type: "string", label: "Browser (CDP) address" },
    { key: "app_url", type: "string", label: "Skyvern app URL" },
    { key: "downloaded_files", type: "array", label: "Downloaded files" },
    { key: "recordings", type: "array", label: "Recordings" },
    { key: "started_at", type: "string", label: "Started at" },
    { key: "completed_at", type: "string", label: "Completed at" },
  ],

  execute(input, ctx) {
    return new SkyvernClient(ctx).json(
      `/v1/browser_sessions/${encodeURIComponent(input.browserSessionId)}`,
    );
  },
};

export default browserSessionGet;
