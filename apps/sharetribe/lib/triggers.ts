import type { OutputField, TriggerDefinition } from "@w6w/types";
import { pollToken } from "../../_shared/poll/mod.ts";
import action from "../actions/event-list.ts";

/** Clock seam. Tests replace `clock.now`; the host has no clock in `ctx`. */
export const clock = { now: (): number => Date.now() };

/** Most events handed to a run in one check; the rest are read on the next check. */
const MAX_EVENTS = 1000;

interface MarketplaceEvent {
  attributes?: { sequenceId?: number; createdAt?: string };
}

const OUTPUT: OutputField[] = [
  { key: "id", type: "string", label: "Event ID" },
  { key: "type", type: "string", label: "Resource type (event)" },
  {
    key: "attributes",
    type: "object",
    label: "Event (sequenceId, createdAt, eventType, resourceId, resourceType, resource)",
  },
];

/**
 * The event log is append-only and, per the vendor, "always returned in ascending order of their
 * sequence ID" starting from the earliest retained event — so it cannot be read newest-first. The
 * poll keeps a token instead: `t:<iso>` before any event has been seen (the first check records the
 * time it ran and sends it as `createdAtStart`), then `s:<sequenceId>` of the last event handed to a
 * run (sent as `startAfterSequenceId`, the vendor's documented way to read on from the last received
 * event; the two filters are mutually exclusive, so only one is ever sent).
 *
 * Seed floor (brief §9.9): the seed time rides along as `s:<sequenceId>@<seedMs>`, and every check
 * drops an event whose own `createdAt` is before it (an event with no parseable `createdAt` is
 * kept). The token still moves past a dropped event, so a pre-seed event is never emitted and never
 * re-read.
 */
async function changes(token: string, ctx: Parameters<NonNullable<typeof action.execute>>[1]) {
  const [head, at] = token.split("@");
  const floorMs = at !== undefined
    ? Number(at)
    : head.startsWith("t:")
    ? Date.parse(head.slice(2))
    : Number.NaN;
  const input = head.startsWith("s:")
    ? { startAfterSequenceId: Number(head.slice(2)) }
    : { createdAtStart: head.slice(2) };
  const res = await action.execute!(input, ctx) as { data?: MarketplaceEvent[] };
  const read = (res.data ?? []).slice(0, MAX_EVENTS);
  const items = read.filter((e) => !(Date.parse(e.attributes?.createdAt ?? "") < floorMs));
  const last = read.at(-1)?.attributes?.sequenceId;
  const keep = Number.isNaN(floorMs) ? "" : `@${floorMs}`;
  return { items, nextToken: last === undefined ? token : `s:${last}${keep}` };
}

export const newEventTrigger: TriggerDefinition = {
  key: "new-event",
  title: "New Marketplace Event",
  description: "The run gets each event the marketplace appends to its event log.",
  output: OUTPUT,
  sample: {
    id: "7c1f1d6e-8d0a-4a41-9e6f-2f3f8f0b9a11",
    type: "event",
    attributes: {
      sequenceId: 12345678,
      createdAt: "2026-11-09T09:00:00.000Z",
      eventType: "listing/created",
      resourceId: "5bbb2f6f-568f-470a-9949-a655e3f6ac46",
      resourceType: "listing",
    },
  },
  minIntervalMs: 300_000,
  poll({ state }, ctx) {
    return pollToken<MarketplaceEvent>({
      state,
      seed: () => Promise.resolve(`t:${new Date(clock.now()).toISOString()}`),
      changes: (token) => changes(token, ctx),
      maxEvents: MAX_EVENTS,
    });
  },
};
