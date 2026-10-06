import type { ActionDefinition } from "@w6w/types";
import { SkyvernClient } from "../lib/client.ts";
import { sessionIdParam } from "../lib/params.ts";

/**
 * `POST /v1/browser_sessions/{browser_session_id}/extend` — answers 200 with the session, or 202
 * with no body when the extension is accepted but not yet applied.
 */
interface Input {
  browserSessionId: string;
  additionalMinutes: number;
}

const browserSessionExtend: ActionDefinition<Input> = {
  key: "browser-session-extend",
  type: "perform",
  resource: "browser-session",
  title: "Extend Browser Session",
  description: "Add minutes to a running browser session's deadline (up to 360 minutes in total).",
  idempotent: false,
  params: [
    sessionIdParam,
    {
      key: "additionalMinutes",
      label: "Additional minutes",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
      hint: "Added to the current deadline. Total lifetime is capped at 360 minutes from start.",
    },
  ],
  output: [
    { key: "accepted", type: "boolean", label: "Extension accepted" },
    { key: "browser_session_id", type: "string", label: "Browser session ID" },
    { key: "timeout", type: "number", label: "Timeout (minutes), when returned" },
    { key: "warning", type: "string", label: "Advisory warning, when returned" },
  ],

  async execute(input, ctx) {
    const session = await new SkyvernClient(ctx).json<Record<string, unknown> | undefined>(
      `/v1/browser_sessions/${encodeURIComponent(input.browserSessionId)}/extend`,
      { method: "POST", body: { additional_minutes: input.additionalMinutes } },
    );
    return { accepted: true, browser_session_id: input.browserSessionId, ...(session ?? {}) };
  },
};

export default browserSessionExtend;
