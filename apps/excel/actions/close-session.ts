import type { ActionDefinition } from "@w6w/types";
import { GraphClient, sessionHeaders, workbookPath, type WorkbookRef } from "../lib/client.ts";
import { workbookParams } from "../lib/params.ts";

interface Input extends WorkbookRef {
  sessionId: string;
}

/**
 * `POST /me/drive/items/{id}/workbook/closeSession`
 * `POST /me/drive/root:/{item-path}:/workbook/closeSession`
 *
 * https://learn.microsoft.com/en-us/graph/api/workbook-closesession
 *
 * The one endpoint where `workbook-session-id` is **required** rather than
 * optional — it is the argument, not a modifier, so `sessionId` is a required
 * param here and advanced everywhere else. Answers `204 No Content`.
 *
 * Idempotent in the sense that matters: closing an already-closed or expired
 * session converges on the same end state (no session). Graph answers `404` for
 * an id it no longer knows, which surfaces as a legible error rather than a
 * silent success — that is the correct trade, since swallowing it would hide a
 * caller passing the wrong id entirely.
 */
const closeSession: ActionDefinition<Input, { status: number }> = {
  key: "close-session",
  type: "perform",
  resource: "workbook",
  title: "Close Session",
  description:
    "Close a workbook session. Releases the server-side workbook copy immediately instead of waiting out the inactivity timeout.",
  idempotent: true,
  params: [
    ...workbookParams(),
    {
      key: "sessionId",
      label: "Workbook session ID",
      type: "string",
      required: true,
      hint:
        "The `id` returned by Create Session. Required here — unlike every other action, this endpoint takes the session as its argument.",
    },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx): Promise<{ status: number }> {
    const client = new GraphClient(ctx);
    const headers = sessionHeaders(input.sessionId);
    if (!headers) throw new Error("Workbook session ID is required to close a session.");

    return await client.status(`${workbookPath(input)}/closeSession`, {
      method: "POST",
      headers,
    });
  },
};

export default closeSession;
