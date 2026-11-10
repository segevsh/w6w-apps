import type { TriggerDefinition } from "@w6w/types";
import { pollTicketsSince } from "../lib/triggers.ts";

const idOf = (item: unknown) => {
  const t = item as { id?: unknown; lastActivityDate?: unknown };
  return `${t.id ?? ""}:${t.lastActivityDate ?? ""}`;
};

/**
 * Tickets created or with new activity since the last check: `lastActivityDate > cursor - 2 minutes` through the existing
 * `entity-query` action (see `pollTicketsSince`).
 */
const trigger: TriggerDefinition = {
  key: "new-or-updated-ticket",
  title: "New or Updated Ticket",
  description: "The run gets each Autotask ticket that is created or has new activity.",
  minIntervalMs: 300_000,
  output: [
    { key: "id", type: "number", label: "Ticket ID" },
    { key: "ticketNumber", type: "string", label: "Ticket number" },
    { key: "title", type: "string", label: "Title" },
    { key: "companyID", type: "number", label: "Company ID" },
    { key: "status", type: "number", label: "Status" },
    { key: "createDate", type: "string", label: "Created" },
    { key: "lastActivityDate", type: "string", label: "Last activity" },
  ],
  sample: {
    id: 12345,
    ticketNumber: "T20261109.0001",
    title: "Printer offline",
    companyID: 42,
    status: 1,
    createDate: "2026-11-09T10:00:00Z",
    lastActivityDate: "2026-11-09T11:30:00Z",
  },
  poll({ state }, ctx) {
    return pollTicketsSince({ field: "lastActivityDate", idOf, state, ctx });
  },
};

export default trigger;
