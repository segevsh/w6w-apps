import type { TriggerDefinition } from "@w6w/types";
import { pollLabelRequests } from "../lib/triggers.ts";

const trigger: TriggerDefinition = {
  key: "new-label-request",
  title: "New Label Request",
  description:
    "The run gets each label request Loop creates for a return (third-party label integrations) since the previous check.",
  output: [
    { key: "id", type: "string", label: "Label request ID" },
    { key: "return_id", type: "number", label: "Return ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: "67329889100573",
    return_id: 12345678,
    status: "issued",
    created_at: "2026-11-10T09:00:00+00:00",
  },
  minIntervalMs: 300_000,
  poll: ({ state }, ctx) => pollLabelRequests(state, ctx),
};

export default trigger;
