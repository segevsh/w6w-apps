import type { TriggerDefinition } from "@w6w/types";
import { pollTicketsSince } from "../lib/triggers.ts";

const idOf = (item: unknown) => String((item as { id?: unknown }).id ?? "");

/**
 * Tickets created since the last check: `createDate > cursor - 2 minutes` through the existing
 * `entity-query` action (see `pollTicketsSince`).
 */
const trigger: TriggerDefinition = {
  key: "new-ticket",
  title: "New Ticket",
  description: "The run gets each newly created Autotask ticket.",
  minIntervalMs: 300_000,
  output: [
    { key: "id", type: "number", label: "Ticket ID" },
    { key: "ticketNumber", type: "string", label: "Ticket number" },
    { key: "title", type: "string", label: "Title" },
    { key: "companyID", type: "number", label: "Company ID" },
    { key: "status", type: "number", label: "Status" },
    { key: "createDate", type: "string", label: "Created" },
  ],
  sample: {
    id: 12345,
    ticketNumber: "T20261109.0001",
    title: "Printer offline",
    companyID: 42,
    status: 1,
    createDate: "2026-11-09T10:00:00Z",
  },
  poll({ state }, ctx) {
    return pollTicketsSince({ field: "createDate", idOf, state, ctx });
  },
};

export default trigger;
