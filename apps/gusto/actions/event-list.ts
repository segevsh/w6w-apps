import type { ActionDefinition } from "@w6w/types";
import { GustoClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /v1/events` — what changed, across everything this token can see.
 *
 * The synchronisation primitive. Every other action in this app answers "what
 * is true now"; this one answers "what has changed since", which is the
 * difference between a workflow that re-reads a whole company every hour and
 * one that reads a page of events.
 *
 * Each event names an `entity_type` and `entity_uuid` plus the `event_type`
 * that happened to it, so a sync reads events and re-fetches only the records
 * that moved. Termination, compensation changes and new hires all arrive here —
 * including the ones `employee-list` hides, since a terminated employee drops
 * out of that list but generates an event on the way.
 */
const action: ActionDefinition = {
  key: "event-list",
  type: "read",
  resource: "event",
  title: "List events",
  description:
    "What changed and when — the feed a sync reads instead of re-reading the whole company. It " +
    "also carries the terminations that make people vanish from the employee list.",
  params: [
    {
      key: "eventTypes",
      label: "Event Types",
      type: "string",
      default: "",
      placeholder: "employee.created,employee.terminated",
      hint: "Comma-separated. Empty returns every type.",
    },
    {
      key: "resourceUuid",
      label: "Resource UUID",
      type: "string",
      default: "",
      advanced: true,
      hint: "Narrow to one company or entity.",
    },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "uuid", type: "string", label: "Event UUID" },
    { key: "event_type", type: "string", label: "Event type" },
    { key: "entity_type", type: "string", label: "Entity type" },
    { key: "entity_uuid", type: "string", label: "Entity UUID" },
    { key: "resource_type", type: "string", label: "Resource type" },
    { key: "resource_uuid", type: "string", label: "Resource UUID" },
    { key: "timestamp", type: "string", label: "Timestamp" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    return await new GustoClient(ctx).requestAll("/v1/events", {
      query: {
        event_types: String(p.eventTypes ?? "") || undefined,
        resource_uuid: String(p.resourceUuid ?? "") || undefined,
      },
    }, returnAll ? Infinity : limit);
  },
};

export default action;
