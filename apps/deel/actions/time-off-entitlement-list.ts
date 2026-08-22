import type { ActionDefinition } from "@w6w/types";
import { DeelClient } from "../lib/client.ts";

/**
 * `GET /time_offs/profile/{hris_profile_id}/entitlements` — verified against
 * Deel's own OpenAPI document (`hris-endpoints.json`,
 * `get-time-off-entitlements`).
 *
 * How much leave someone actually has left, which is the question a request
 * workflow needs answered *before* it creates one.
 */
const action: ActionDefinition = {
  key: "time-off-entitlement-list",
  type: "read",
  resource: "timeOff",
  title: "List a person's leave balances",
  description: "Read how much leave a worker has accrued and used.",
  params: [
    {
      key: "hrisProfileId",
      label: "HRIS Profile ID",
      type: "string",
      required: true,
      default: "",
    },
  ],
  output: [{ key: "data", type: "array", label: "Entitlements" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.hrisProfileId ?? "").trim();
    if (!id) throw new Error("`hrisProfileId` is required");

    ctx.log("info", "listing Deel time-off entitlements", { id });

    return await new DeelClient(ctx).request(
      `/time_offs/profile/${encodeURIComponent(id)}/entitlements`,
    );
  },
};

export default action;
