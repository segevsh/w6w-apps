import type { ActionDefinition, HookContext, TriggerDefinition } from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";
import activityList from "../actions/activity-list.ts";

/** Look-back before the previous check, so an event that lands late is still seen. */
export const OVERLAP_MS = 120_000;

/** Clock seam. Tests replace `clock.now`; the host has no clock in `ctx`. */
export const clock = { now: (): number => Date.now() };

interface Activity {
  id?: string;
  createdAt?: string;
}

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
  async poll({ state }, ctx: HookContext) {
    const checkedAt = clock.now();
    const prior = state as { cursor?: number } | undefined;
    const cursor = typeof prior?.cursor === "number" ? prior.cursor : checkedAt;
    const fromDate = new Date(cursor - OVERLAP_MS).toISOString();
    const { events, nextState } = await pollNewItems<Activity>({
      state,
      maxPages: 1,
      idOf: (a) => String(a.id ?? ""),
      async fetchPage() {
        // `GET /v1/organizations/{id}/activities?from_date=` — one unpaged response.
        const res = await (activityList as unknown as ActionDefinition).execute(
          { fromDate },
          ctx,
        ) as {
          activities?: Activity[];
        };
        const items = (res.activities ?? []).slice();
        items.sort((a, b) => (a.createdAt ?? "") < (b.createdAt ?? "") ? 1 : -1);
        return { items };
      },
    });
    return { events, nextState: { ...nextState, cursor: checkedAt } };
  },
};

export default trigger;
