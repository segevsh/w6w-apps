import type { TriggerDefinition } from "@w6w/types";
import callList from "../actions/call-list.ts";
import { pollCalls } from "../lib/triggers.ts";

/**
 * Wraps `call-list` (GET /v1/calls/) as a since-filter trigger: `from_date` is the last check minus
 * an overlap, `to_date` is now. The call's `start_at` is compared with the seed floor, so calls
 * that existed before the first check never fire (https://dev.avoma.com/openapi.yml, verified
 * 2026-11-10).
 */
const trigger: TriggerDefinition = {
  key: "new-call",
  title: "New Call",
  description:
    "The run gets each new call (from a connected dialer or created through the API) once Avoma lists it.",
  params: (callList.params ?? []).filter((p) => p.key === "direction"),
  output: [
    { key: "external_id", type: "string", label: "Call ID" },
    { key: "direction", type: "string", label: "Direction" },
    { key: "start_at", type: "string", label: "Start time" },
    { key: "end_at", type: "string", label: "End time" },
    { key: "user_email", type: "string", label: "Avoma user email" },
    { key: "subject", type: "string", label: "Subject" },
  ],
  sample: {
    external_id: "call-0001",
    direction: "outbound",
    start_at: "2026-11-09T15:00:00Z",
    end_at: "2026-11-09T15:10:00Z",
    user_email: "rep@example.com",
    subject: "Follow-up call",
  },
  minIntervalMs: 300_000,
  poll({ params, state }, ctx) {
    return pollCalls(state, (params ?? {}) as Record<string, unknown>, ctx);
  },
};

export default trigger;
