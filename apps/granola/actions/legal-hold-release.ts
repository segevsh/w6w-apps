import type { ActionDefinition } from "@w6w/types";
import { encodeId, GranolaClient } from "../lib/client.ts";
import { holdIdParam } from "../lib/params.ts";

/**
 * `DELETE /v1/legal-holds/{hold_id}` — release a hold. Terminal: the hold is
 * never deleted, there is no un-release, and a reopened matter is a new hold.
 * Idempotent, and the vendor says so: releasing an already-released hold returns
 * its original `released_at`.
 */
interface Input {
  holdId: string;
}

const legalHoldRelease: ActionDefinition<Input> = {
  key: "legal-hold-release",
  type: "perform",
  resource: "legal-hold",
  title: "Release Legal Hold",
  description: "Release a legal hold. Irreversible; a reopened matter needs a new hold.",
  idempotent: true,
  params: [holdIdParam],
  output: [
    { key: "id", type: "string", label: "Legal hold ID" },
    { key: "released", type: "boolean", label: "Always true on success" },
    { key: "released_at", type: "string", label: "Released at" },
  ],

  execute(input, ctx) {
    return new GranolaClient(ctx).request(`/legal-holds/${encodeId(input.holdId)}`, {
      method: "DELETE",
    });
  },
};

export default legalHoldRelease;
