import type { ActionDefinition } from "@w6w/types";
import { GraphClient } from "../lib/client.ts";
import { buildEvent, type EventInput, eventParams, scheduleParams } from "../lib/event.ts";

interface Input extends EventInput {
  calendarId?: string;
}

/**
 * `POST /me/events`, or `POST /me/calendars/{id}/events`.
 *
 * https://learn.microsoft.com/en-us/graph/api/user-post-events
 *
 * The one genuinely nice thing Graph does here: `transactionId` is a
 * client-supplied dedupe key, documented as existing "for the server to avoid
 * redundant POST operations in case of client retries to create the same
 * event". That is exactly the invocation-id contract, so when the caller does
 * not supply one this action stamps `ctx.invocation.invocationId` — which is
 * what lets this action declare `idempotent: true` while every other `perform`
 * here cannot.
 *
 * Note the value is write-once: Graph rejects changing `transactionId` on a
 * later update, and only echoes it back if the app set it.
 *
 * Requires the `Calendars.ReadWrite` scope. Answers `201 Created`.
 */
const createEvent: ActionDefinition<Input> = {
  key: "create-event",
  type: "perform",
  resource: "event",
  title: "Create Event",
  description: "Create a calendar event, optionally with attendees and an online meeting.",
  // Safe to retry: the transactionId below makes a duplicate POST a no-op
  // server-side rather than a second event.
  idempotent: true,
  params: [
    {
      key: "calendarId",
      label: "Calendar ID",
      type: "string",
      hint: "From List Calendars. Leave empty for the default calendar.",
    },
    ...scheduleParams(true),
    ...eventParams(),
    {
      key: "transactionId",
      label: "Transaction ID",
      type: "string",
      advanced: true,
      hint:
        "Server-side dedupe key. Defaults to this invocation's id, so a retried run does not create a second event. Cannot be changed after creation.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Event ID" },
    { key: "subject", type: "string", label: "Title" },
    { key: "start", type: "object", label: "Starts" },
    { key: "end", type: "object", label: "Ends" },
    { key: "webLink", type: "string", label: "Web link" },
    { key: "onlineMeeting", type: "object", label: "Online meeting" },
  ],

  execute(input, ctx) {
    const client = new GraphClient(ctx);
    const path = input.calendarId
      ? `/me/calendars/${encodeURIComponent(input.calendarId)}/events`
      : "/me/events";

    const body = buildEvent({
      ...input,
      transactionId: input.transactionId ?? ctx.invocation?.invocationId,
    });

    return client.request(path, { method: "POST", body });
  },
};

export default createEvent;
