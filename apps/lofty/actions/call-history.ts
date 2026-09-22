import type { ActionDefinition } from "@w6w/types";
import { LoftyClient } from "../lib/client.ts";
import { leadIdParam } from "../lib/params.ts";

/**
 * `GET /v1.0/communication/call?leadId={leadId}` — a lead's call history.
 *
 * Answers `{ calls: [...] }`. Alongside the timestamps and duration, each row
 * carries what an agent recorded: `callingOutcome` (a tag such as "Talked"),
 * `rateScore` (0–5) and `recordingSwitch`. `direction` is from the agent's
 * point of view, and `showUserNumber` is the caller ID the lead saw — which can
 * differ from the agent's own `userPhoneNumber`.
 *
 * `currentId` pages by id rather than offset.
 */
interface Input {
  leadId: number;
  limit?: number;
  offset?: number;
  currentId?: number;
}

const action: ActionDefinition<Input> = {
  key: "call-history",
  type: "read",
  resource: "communication",
  title: "Call History",
  description: "List a lead's call history (GET /v1.0/communication/call).",
  params: [
    leadIdParam,
    { key: "limit", label: "Limit", type: "number", validation: { integer: true, min: 1 } },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      validation: { integer: true, min: 0 },
    },
    {
      key: "currentId",
      label: "Start from ID",
      type: "number",
      advanced: true,
      hint: "Page by id: retrieve entries sequentially from this id.",
    },
  ],
  output: [{ key: "calls", type: "array", label: "Call entries" }],

  execute(input, ctx) {
    return new LoftyClient(ctx).request("/communication/call", {
      query: {
        leadId: input.leadId,
        limit: input.limit,
        offset: input.offset,
        currentId: input.currentId,
      },
    });
  },
};

export default action;
