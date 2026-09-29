import type { ActionDefinition } from "@w6w/types";
import { SharetribeClient } from "../lib/client.ts";
import { listOutput } from "../lib/params.ts";

interface Input {
  startAfterSequenceId?: number;
  createdAtStart?: string;
  resourceId?: string;
  relatedResourceId?: string;
  eventTypes?: string;
}

/**
 * `GET /v1/integration_api/events/query` — the marketplace's append-only event log.
 *
 * Events are always returned in ascending sequence-ID order, starting from the earliest
 * retained event unless filtered. Sharetribe retains 90 days of history for live marketplaces
 * (7 days for dev/test). **This endpoint does not support `page`** — use the sequence ID of the
 * last event you received as the next call's `startAfterSequenceId` to page forward, which is
 * why this action does not offer the shared `paginationParams()`.
 *
 * At most one of `startAfterSequenceId`/`createdAtStart`, and at most one of
 * `resourceId`/`relatedResourceId`, may be given — Sharetribe rejects both being set.
 */
const eventList: ActionDefinition<Input> = {
  key: "event-list",
  type: "search",
  resource: "event",
  title: "List Events",
  description: "Poll the marketplace's event log — every create/update/delete across users, " +
    "listings, transactions and more.",
  params: [
    {
      key: "startAfterSequenceId",
      label: "After sequence ID",
      type: "number",
      validation: { integer: true },
      hint: "Return only events with a sequence ID greater than this. Use the last event's own " +
        "sequenceId to page forward.",
    },
    {
      key: "createdAtStart",
      label: "Created at or after",
      type: "datetime",
      hint: "At most 90 days in the past (live) / 7 days (dev, test). Mutually exclusive with " +
        "After sequence ID.",
    },
    { key: "resourceId", label: "Resource ID", type: "string" },
    {
      key: "relatedResourceId",
      label: "Related resource ID",
      type: "string",
      hint: "Also matches events for resources with a cardinality-one relationship to this " +
        "one, e.g. a listing ID also matches its transactions' events.",
    },
    {
      key: "eventTypes",
      label: "Event types",
      type: "string",
      hint: 'Comma-separated, e.g. "listing/updated,message/created". A bare resource type ' +
        '(e.g. "listing") matches every event for it.',
    },
  ],
  output: listOutput,

  execute(input, ctx) {
    return new SharetribeClient(ctx).query("/events/query", {
      startAfterSequenceId: input.startAfterSequenceId,
      createdAtStart: input.createdAtStart,
      resourceId: input.resourceId,
      relatedResourceId: input.relatedResourceId,
      eventTypes: input.eventTypes,
    });
  },
};

export default eventList;
