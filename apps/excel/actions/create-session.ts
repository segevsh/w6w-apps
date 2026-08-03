import type { ActionDefinition } from "@w6w/types";
import { GraphClient, workbookPath, type WorkbookRef } from "../lib/client.ts";
import { workbookParams } from "../lib/params.ts";

interface Input extends WorkbookRef {
  persistChanges?: boolean;
}

interface SessionInfo {
  id?: string;
  persistChanges?: boolean;
}

interface Output {
  sessionId?: string;
  persistChanges?: boolean;
}

/**
 * `POST /me/drive/items/{id}/workbook/createSession`
 * `POST /me/drive/root:/{item-path}:/workbook/createSession`
 *
 * https://learn.microsoft.com/en-us/graph/api/workbook-createsession
 *
 * The three modes, in Microsoft's own words, and why this action exists:
 *
 *   - **Persistent session** (`persistChanges: true`) — "All changes made to the
 *     workbook are persisted (saved). This is the most efficient and performant
 *     mode of operation." Expires after about **5 minutes** of inactivity.
 *   - **Non-persistent session** (`persistChanges: false`) — changes are made
 *     against a temporary server-side copy and are **lost** when the session
 *     expires. For calculating or rendering without touching the document.
 *     Expires after about **7 minutes** of inactivity.
 *   - **Sessionless** — no session id on the request at all. Legal, slower
 *     (Excel has to locate the workbook every call), and — this is the part that
 *     surprises people — **changes are still saved**. Omitting the header is not
 *     a dry run.
 *
 * So a session is a performance and discard-my-work control, not a save control.
 * Feed the returned `sessionId` into the other actions' `Workbook session ID`
 * param, and close it with Close Session when done rather than waiting out the
 * inactivity timeout. An expired id makes subsequent calls answer `404`.
 *
 * `Prefer: respond-async` (Graph's long-running-operation form, which answers
 * `202 Accepted` plus a `Location` to poll) is deliberately not used: an action
 * that returns a polling URL instead of a session id would not compose.
 *
 * Not idempotent — each call mints a distinct session, and Graph offers no
 * client-supplied dedupe key for it.
 */
const createSession: ActionDefinition<Input, Output> = {
  key: "create-session",
  type: "perform",
  resource: "workbook",
  title: "Create Session",
  description:
    "Open a workbook session and return its id for the `workbook-session-id` header. Persistent sessions save changes; non-persistent ones discard them on expiry.",
  idempotent: false,
  params: [
    ...workbookParams(),
    {
      key: "persistChanges",
      label: "Persist changes",
      type: "boolean",
      default: true,
      hint:
        "On: changes are saved to the file (the usual mode). Off: changes land on a temporary server-side copy and are lost when the session expires — for calculation or chart rendering that must not alter the document.",
    },
  ],
  output: [
    { key: "sessionId", type: "string", label: "Session ID" },
    { key: "persistChanges", type: "boolean", label: "Persists changes" },
  ],

  async execute(input, ctx): Promise<Output> {
    const client = new GraphClient(ctx);
    const persistChanges = input.persistChanges ?? true;
    ctx.log("info", "opening workbook session", { persistChanges });

    const info = await client.request<SessionInfo>(
      `${workbookPath(input)}/createSession`,
      { method: "POST", body: { persistChanges } },
    );

    return { sessionId: info?.id, persistChanges: info?.persistChanges };
  },
};

export default createSession;
