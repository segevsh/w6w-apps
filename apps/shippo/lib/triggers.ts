import { pollSinceWindow } from "./since-window.ts";
import shipmentList from "../actions/shipment-list.ts";
import type { HookContext, TriggerDefinition } from "@w6w/types";

export const clock = { now: (): number => Date.now() };
const OVERLAP_MS = 120_000;
const PAGE = 100;

interface Shipment {
  object_id?: unknown;
  object_created?: unknown;
}

/**
 * Shippo documents no list order, so this relies on none: `object_created_gte` selects the window,
 * the page number is persisted until `next` is empty, and the id dedupe absorbs any row that
 * moves between pages.
 */
function check(state: unknown, ctx: HookContext) {
  return pollSinceWindow<Shipment>({
    state,
    now: clock.now(),
    overlapMs: OVERLAP_MS,
    firstPos: 1,
    step: 1,
    maxPages: 2,
    maxEvents: 2 * PAGE,
    seenWindow: 500,
    idOf: (row) => String(row.object_id ?? ""),
    stampOf: (row) => {
      const ms = typeof row.object_created === "string" ? Date.parse(row.object_created) : NaN;
      return Number.isNaN(ms) ? undefined : ms;
    },
    async fetchPage(sinceMs, page) {
      const result = await shipmentList.execute({
        results: PAGE,
        page,
        objectCreatedGte: new Date(sinceMs).toISOString(),
      }, ctx) as { results?: Shipment[]; next?: string | null };
      const items = result.results ?? [];
      return { items, more: typeof result.next === "string" && result.next.length > 0 };
    },
  });
}

export const newShipmentTrigger: TriggerDefinition = {
  key: "new-shipment",
  title: "New Shipment",
  description: "Runs when a shipment is created in Shippo. The run gets the shipment.",
  output: [
    { key: "object_id", type: "string", label: "Shipment ID" },
    { key: "object_created", type: "string", label: "Created at" },
    { key: "status", type: "string", label: "Status" },
  ],
  sample: {
    object_id: "d799c2679e644279b59fe661ac8fa488",
    object_created: "2026-11-09T12:00:00.000Z",
    status: "SUCCESS",
  },
  minIntervalMs: 300_000,
  poll({ state }, ctx) {
    return check(state, ctx);
  },
};
