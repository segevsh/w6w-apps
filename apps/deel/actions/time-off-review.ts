import type { ActionDefinition } from "@w6w/types";
import { compact, DeelClient } from "../lib/client.ts";

/**
 * `POST /time_offs/review` — verified against Deel's own OpenAPI document
 * (`hris-endpoints.json`, `review-time-off-request`), whose body requires a
 * `data` object.
 *
 * Approve or deny a pending request. Note the shape: the review is a **POST to
 * a collection**, not a PATCH on the request — Deel models the decision as its
 * own event, which is why the request id travels in the body.
 */
const action: ActionDefinition = {
  key: "time-off-review",
  type: "perform",
  resource: "timeOff",
  title: "Approve or deny time off",
  description: "Review a pending time-off request.",
  // Reviewing an already-reviewed request lands in the same state.
  idempotent: true,
  params: [
    {
      key: "timeOffId",
      label: "Time Off ID",
      type: "string",
      required: true,
      default: "",
    },
    {
      key: "status",
      label: "Decision",
      type: "select",
      required: true,
      default: "APPROVED",
      options: [
        { value: "APPROVED", label: "Approve" },
        { value: "REJECTED", label: "Deny" },
      ],
    },
    {
      key: "reason",
      label: "Reason",
      type: "text",
      default: "",
      hint: "Shown to the worker — worth filling in on a denial.",
    },
  ],
  output: [{ key: "data", type: "object", label: "Reviewed request" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const timeOffId = String(p.timeOffId ?? "").trim();
    const status = String(p.status ?? "").trim();
    if (!timeOffId) throw new Error("`timeOffId` is required");
    if (!status) throw new Error("`status` is required");

    ctx.log("info", "reviewing Deel time off", { timeOffId, status });

    return await new DeelClient(ctx).request("/time_offs/review", {
      method: "POST",
      body: { data: compact({ time_off_id: timeOffId, status, reason: p.reason }) },
    });
  },
};

export default action;
