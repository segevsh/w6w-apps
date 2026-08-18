import type { ActionDefinition } from "@w6w/types";
import { csv, WorkOSClient } from "../lib/client.ts";

/**
 * `GET /events` — the ordered stream of everything that happened.
 *
 * ## This is the only correct way to follow directory changes
 *
 * `directory-user-list` answers "who is in this directory now". That is a
 * different question from "what changed", and the gap between them is where
 * offboarding lives: **a user removed from the customer's Okta simply stops
 * appearing in the listing**, leaving nothing to react to. The event stream
 * carries `dsync.user.deleted` explicitly, in order, with the user's last known
 * state attached.
 *
 * So a provisioning workflow reads events and a reporting one reads listings.
 * Getting that the wrong way round produces a system that creates accounts
 * reliably and never deletes them.
 *
 * ## `events` is required — there is no "everything"
 *
 * Unlike every other list here, the event types must be named. That is a
 * deliberate API decision and it means a workflow has to decide what it cares
 * about up front, so this action makes the common sets easy to reach.
 *
 * ## The cursor is an event id
 *
 * Paging is `after`, and the value is the id of the last event seen — not an
 * opaque blob. Store it, pass it next run, and the stream resumes exactly where
 * it stopped, with no gaps and no repeats. `range_start` is the alternative for
 * a first run, and the two are mutually exclusive.
 */
const action: ActionDefinition = {
  key: "event-list",
  type: "read",
  resource: "event",
  title: "List events",
  description:
    "The ordered stream of what changed — the only place a directory DELETION appears, since a " +
    "removed user simply stops being listed.",
  params: [
    {
      key: "events",
      label: "Event Types",
      type: "string",
      required: true,
      default: "dsync.user.created,dsync.user.updated,dsync.user.deleted",
      placeholder: "dsync.user.created,dsync.user.deleted,connection.activated",
      hint: "Comma-separated, and REQUIRED — WorkOS has no 'all events'. The directory trio is " +
        "the usual provisioning set; add `connection.activated` and `dsync.activated` to learn " +
        "when a customer finishes setup.",
    },
    {
      key: "after",
      label: "After Event ID",
      type: "string",
      default: "",
      hint: "The last event id you processed. Store it and pass it next run to resume with no " +
        "gaps and no repeats.",
    },
    {
      key: "rangeStart",
      label: "From",
      type: "datetime",
      default: "",
      hint: "For a first run, when there is no cursor yet. Mutually exclusive with After.",
    },
    {
      key: "organizationId",
      label: "Organization ID",
      type: "string",
      default: "",
      advanced: true,
      hint: "Narrow to one customer.",
    },
    {
      key: "maxPages",
      label: "Maximum Pages",
      type: "number",
      default: 10,
      hint: "A ceiling on the cursor loop; each page is a request.",
    },
  ],
  output: [
    { key: "events", type: "array", label: "Events" },
    { key: "lastEventId", type: "string", label: "Last event id — pass as `after` next run" },
    { key: "count", type: "number", label: "Events returned" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const events = csv(p.events);
    if (!events) {
      throw new Error(
        "`events` is required — WorkOS has no 'all events' option, so a caller has to name the " +
          "types it wants",
      );
    }
    const after = String(p.after ?? "").trim();
    const rangeStart = String(p.rangeStart ?? "").trim();
    if (after && rangeStart) {
      throw new Error("give either `after` or `rangeStart` — WorkOS rejects the pair");
    }

    const client = new WorkOSClient(ctx);
    const maxPages = Math.max(1, Number(p.maxPages ?? 10));
    const collected: Array<{ id?: string }> = [];
    let cursor = after || undefined;
    let pages = 0;

    while (pages < maxPages) {
      const body = await client.request<
        { data?: Array<{ id?: string }>; list_metadata?: { after?: string | null } }
      >("/events", {
        query: {
          events,
          limit: 100,
          after: cursor,
          range_start: cursor ? undefined : (rangeStart || undefined),
          organization_id: String(p.organizationId ?? "") || undefined,
        },
      });
      const chunk = body?.data ?? [];
      collected.push(...chunk);
      pages += 1;
      const next = body?.list_metadata?.after ?? undefined;
      if (!next || chunk.length === 0) break;
      cursor = next;
    }

    const lastEventId = collected.length > 0
      ? String(collected[collected.length - 1]?.id ?? "")
      : after || undefined;

    ctx.log("info", "read WorkOS events", { count: collected.length, pages });
    return { events: collected, lastEventId, count: collected.length };
  },
};

export default action;
