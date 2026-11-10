import type { TriggerDefinition } from "@w6w/types";
import { pollReturns } from "../lib/triggers.ts";

const trigger: TriggerDefinition = {
  key: "new-or-updated-return",
  title: "New or Updated Return",
  description:
    "The run gets each return that is created or changed since the previous check, so a state change arrives as a new event.",
  output: [
    { key: "id", type: "string", label: "Return ID" },
    { key: "state", type: "string", label: "State" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],
  sample: {
    id: "12345678",
    state: "closed",
    created_at: "2026-11-10T09:00:00+00:00",
    updated_at: "2026-11-10T09:30:00+00:00",
  },
  minIntervalMs: 300_000,
  poll: ({ state }, ctx) => pollReturns("updated_at", state, ctx),
};

export default trigger;
