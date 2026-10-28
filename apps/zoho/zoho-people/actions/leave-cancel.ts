import type { ActionDefinition } from "@w6w/types";
import { peopleCall } from "../lib/people.ts";

interface Input {
  recordId: string;
  reason?: string;
}

const leaveCancel: ActionDefinition<Input> = {
  key: "leave-cancel",
  type: "perform",
  resource: "leave",
  title: "Cancel Leave",
  description: "Cancel a leave record by its record id (from List Records on the `leave` form).",
  idempotent: true,
  params: [
    { key: "recordId", label: "Leave record ID", type: "string", required: true },
    { key: "reason", label: "Reason", type: "string" },
  ],
  output: [
    { key: "status", type: "string", label: "`success` when cancelled" },
    { key: "message", type: "string", label: "Vendor message" },
  ],

  async execute(input, ctx) {
    const id = String(input.recordId ?? "").trim();
    if (!/^\d+$/.test(id)) throw new Error("`recordId` must be the numeric leave record id.");
    // Newer v2 family: lives at /api/v2/..., answers `{message,status}` with no `response` wrapper.
    const { result } = await peopleCall(ctx, `/api/v2/leavetracker/leaves/records/cancel/${id}`, {
      method: "PATCH",
      query: { reason: input.reason },
    });
    const r = (result ?? {}) as { status?: string; message?: string };
    return { status: r.status ?? null, message: r.message ?? null };
  },
};

export default leaveCancel;
