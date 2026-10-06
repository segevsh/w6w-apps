import type { ActionDefinition } from "@w6w/types";
import { ServiceTitanClient } from "../lib/client.ts";

/** `PUT /jpm/v2/tenant/{tenant}/jobs/{id}/cancel` — requires `reasonId` and `memo`. */
interface Input {
  id: number;
  reasonId: number;
  memo: string;
}

const jobCancel: ActionDefinition<Input> = {
  key: "job-cancel",
  type: "perform",
  resource: "job",
  title: "Cancel a Job",
  description:
    "Cancel a job with a cancel reason and memo. The cancellation can be reversed in ServiceTitan.",
  idempotent: true,
  params: [
    { key: "id", label: "Job ID", type: "number", required: true },
    {
      key: "reasonId",
      label: "Cancel reason ID",
      type: "number",
      required: true,
      hint: "The tenant's own cancel-reason ids (Settings → Job cancel reasons).",
    },
    { key: "memo", label: "Memo", type: "text", required: true },
  ],
  output: [{ key: "ok", type: "boolean", label: "Cancelled" }],

  async execute(input, ctx) {
    await new ServiceTitanClient(ctx).request(
      "jpm",
      `/jobs/${encodeURIComponent(String(input.id))}/cancel`,
      { method: "PUT", body: { reasonId: input.reasonId, memo: input.memo } },
    );
    return { ok: true };
  },
};

export default jobCancel;
