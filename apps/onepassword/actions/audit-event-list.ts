import type { ActionDefinition } from "@w6w/types";
import { OnePasswordClient } from "../lib/client.ts";
import {
  CURSOR_PARAM,
  END_TIME_PARAM,
  eventsBody,
  LIMIT_PARAM,
  START_TIME_PARAM,
} from "../lib/events.ts";

/**
 * `POST /api/v2/auditevents` — what changed in the account.
 *
 * Members added and removed, vaults created, permissions granted, groups
 * altered, integrations issued tokens. This is the administrative record, and
 * it is the half of 1Password's audit trail that answers "who changed the
 * shape of things".
 *
 * ## `actor_uuid` is a person, and the object is what they touched
 *
 * Each event carries an `action` (`create`, `delete`, `grant`, `join`, …), an
 * `object_type` (`user`, `vault`, `group`, `sa` for service accounts) and the
 * uuids of both the actor and the object. There are no names — resolving a uuid
 * to a person is a separate lookup 1Password does not offer here, which is
 * deliberate: the event stream is safe to ship to a SIEM precisely because it
 * names nobody.
 *
 * ## `hasMore`, not the cursor, is what ends a loop
 *
 * The response always carries a cursor. Paging until the cursor is absent
 * therefore never terminates — see `lib/events.ts`.
 */
const action: ActionDefinition = {
  key: "audit-event-list",
  type: "read",
  resource: "event",
  title: "List audit events",
  description:
    "What changed in the account — members, vaults, permissions, integrations. Events name uuids " +
    "rather than people, which is what makes the stream safe to forward.",
  params: [START_TIME_PARAM, END_TIME_PARAM, LIMIT_PARAM, CURSOR_PARAM],
  output: [
    { key: "events", type: "array", label: "Audit events" },
    { key: "count", type: "number", label: "Returned in this page" },
    { key: "cursor", type: "string", label: "Pass back for the next page" },
    {
      key: "hasMore",
      type: "boolean",
      label: "Whether to keep going — NOT whether a cursor exists",
    },
    { key: "actions", type: "array", label: "The distinct actions in this page" },
  ],

  async execute(input, ctx) {
    const client = new OnePasswordClient(ctx);
    const host = client.requireEvents("audit-event-list");
    const p = input as Record<string, unknown>;

    const result = await client.request<{
      items?: Array<{ action?: string; object_type?: string }>;
      cursor?: string;
      has_more?: boolean;
    }>(host, "/api/v2/auditevents", {
      method: "POST",
      body: eventsBody(
        String(p.cursor ?? "").trim(),
        Number(p.limit ?? 100),
        String(p.startTime ?? "").trim(),
        String(p.endTime ?? "").trim(),
      ),
    });

    const events = result?.items ?? [];
    ctx.log("info", "read 1Password audit events", { count: events.length });

    return {
      events,
      count: events.length,
      cursor: result?.cursor,
      // The cursor is always present, so this is the only usable stop condition.
      hasMore: result?.has_more === true,
      actions: [...new Set(events.map((event) => event?.action).filter(Boolean))],
    };
  },
};

export default action;
