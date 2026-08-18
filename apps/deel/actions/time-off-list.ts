import type { ActionDefinition } from "@w6w/types";
import { DeelClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /time_offs/profile/{hris_profile_id}` — verified against Deel's own
 * OpenAPI document (`hris-endpoints.json`, `get-time-off-profile`).
 *
 * Deel scopes time off to a **profile** rather than offering a flat
 * organization-wide list, so this takes the profile whose requests you want.
 * `person-list` returns the ids.
 */
const action: ActionDefinition = {
  key: "time-off-list",
  type: "read",
  resource: "timeOff",
  title: "List a person's time off",
  description: "List one worker's time-off requests.",
  params: [
    {
      key: "hrisProfileId",
      label: "HRIS Profile ID",
      type: "string",
      required: true,
      default: "",
    },
    ...LIST_PARAMS,
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.hrisProfileId ?? "").trim();
    if (!id) throw new Error("`hrisProfileId` is required");
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Deel time off", { id });

    return await new DeelClient(ctx).requestAllOffset(
      `/time_offs/profile/${encodeURIComponent(id)}`,
      {},
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
