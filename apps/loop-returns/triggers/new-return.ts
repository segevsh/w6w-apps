import type { TriggerDefinition } from "@w6w/types";
import { pollReturns } from "../lib/triggers.ts";

const trigger: TriggerDefinition = {
  key: "new-return",
  title: "New Return",
  description:
    "The run gets each return created since the previous check (open, closed and expired returns; Loop's default state set).",
  output: [
    { key: "id", type: "string", label: "Return ID" },
    { key: "state", type: "string", label: "State" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],
  sample: {
    id: "12345678",
    state: "open",
    created_at: "2026-11-10T09:00:00+00:00",
    updated_at: "2026-11-10T09:00:00+00:00",
  },
  minIntervalMs: 300_000,
  poll: ({ state }, ctx) => pollReturns("created_at", state, ctx),
};

export default trigger;
