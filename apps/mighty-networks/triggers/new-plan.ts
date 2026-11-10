import type { OutputField, TriggerDefinition } from "@w6w/types";
import { SNAPSHOT_OUTPUT, snapshotPoll } from "../lib/triggers.ts";
import planList from "../actions/plan-list.ts";

/**
 * `GET /plans` (the `plan-list` action), read page by page and diffed: the Network's plans are
 * a small bounded collection and the Admin API documents no sort order or since filter on the list.
 * Docs (verified 2026-11-10): https://docs.mightynetworks.com/llms.txt (Admin API v1 / Plans)
 */
const newPlan: TriggerDefinition = {
  key: "new-plan",
  title: "New Plan",
  description:
    "The run gets each plan newly created in your Network (no webhook event announces a new plan): the plan (id, name, amount, currency, interval).",
  output: SNAPSHOT_OUTPUT as OutputField[],
  sample: {
    change: "added",
    key: "333",
    values: {
      id: 333,
      name: "Pro",
      amount: 2900,
      currency: "usd",
      interval: "month",
      type: "subscription",
    },
  },
  minIntervalMs: 3_600_000,
  poll({ state }, ctx) {
    return snapshotPoll({
      state,
      label: "plans",
      fetchPage: (page, perPage) => planList.execute({ page, perPage }, ctx),
    });
  },
};

export default newPlan;
