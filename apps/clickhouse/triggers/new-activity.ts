import type { ActionDefinition, HookContext, TriggerDefinition } from "@w6w/types";
import { pollWindow, toMs } from "../lib/window.ts";
import activityList from "../actions/activity-list.ts";

/** Look-back before the previous check, so an event that lands late is still seen. */
export const OVERLAP_MS = 120_000;
/** The ids kept so an overlap re-read never re-emits; the response is unpaged, so this is generous. */
const SEEN_WINDOW = 5000;

/** Clock seam. Tests replace `clock.now`; the host has no clock in `ctx`. */
export const clock = { now: (): number => Date.now() };

interface Activity {
  id?: string;
  createdAt?: string;
}

/**
 * `GET /v1/organizations/{id}/activities?from_date=` answers the whole window in ONE unpaged
 * response, so a check cannot stall on a long window (brief 9.8): every record in it is emitted,
 * whatever its size, and the cursor moves to the check time. The seed stores `floor = now` and later
 * checks drop activities created before it (brief 9.9).
 */
const trigger: TriggerDefinition = {
  key: "new-activity",
  title: "New Activity",
  description:
    "The run gets each new ClickHouse Cloud organization activity event (services created, scaled, stopped, deleted).",
  output: [
    { key: "id", type: "string", label: "Activity ID" },
    { key: "type", type: "string", label: "Event type" },
    { key: "actorType", type: "string", label: "Actor type" },
    { key: "actorId", type: "string", label: "Actor ID" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],
  sample: {
    id: "activity-1",
    type: "service_create",
    actorType: "user",
    actorId: "user-1",
    createdAt: "2026-11-09T09:00:00Z",
  },
  minIntervalMs: 300_000,
  poll({ state }, ctx: HookContext) {
    return pollWindow<Activity, number>({
      state,
      now: clock.now(),
      overlapMs: OVERLAP_MS,
      maxPages: 1,
      pageSize: 1,
      seenWindow: SEEN_WINDOW,
      idOf: (a) => String(a.id ?? ""),
      tsOf: (a) => toMs(a.createdAt),
      async load(sinceMs) {
        const res = await (activityList as unknown as ActionDefinition).execute(
          { fromDate: new Date(sinceMs).toISOString() },
          ctx,
        ) as {
          activities?: Activity[];
        };
        return { items: res.activities ?? [] };
      },
    });
  },
};

export default trigger;
