import type { ActionDefinition } from "@w6w/types";
import { DeelClient } from "../lib/client.ts";

/**
 * `GET /people/{hris_profile_id}` — verified against Deel's own OpenAPI
 * document (`hris-endpoints.json`, `get-person-by-id`).
 *
 * Note the identifier: an **HRIS profile id**, which is not the same as a
 * contract id or a worker id. `person-list` returns it.
 */
const action: ActionDefinition = {
  key: "person-get",
  type: "read",
  resource: "person",
  title: "Get a person",
  description: "Retrieve one worker's profile.",
  params: [
    {
      key: "hrisProfileId",
      label: "HRIS Profile ID",
      type: "string",
      required: true,
      default: "",
      hint: "From List people — not a contract or worker id.",
    },
  ],
  output: [{ key: "data", type: "object", label: "Person" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.hrisProfileId ?? "").trim();
    if (!id) throw new Error("`hrisProfileId` is required");

    ctx.log("info", "getting Deel person", { id });
    return await new DeelClient(ctx).request(`/people/${encodeURIComponent(id)}`);
  },
};

export default action;
