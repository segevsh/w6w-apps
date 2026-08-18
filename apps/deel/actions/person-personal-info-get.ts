import type { ActionDefinition } from "@w6w/types";
import { DeelClient } from "../lib/client.ts";

/**
 * `GET /people/{worker_id}/personal` — verified against Deel's own OpenAPI
 * document (`hris-endpoints.json`, `get-person-personal-info`).
 *
 * Personal information is a **separate endpoint from the profile** and keyed by
 * **worker id**, not the HRIS profile id `person-get` takes. Deel separates
 * them because this data is more sensitive, and a token may be able to read one
 * and not the other.
 */
const action: ActionDefinition = {
  key: "person-personal-info-get",
  type: "read",
  resource: "person",
  title: "Get a person's personal information",
  description: "Read a worker's personal details — a separate, more sensitive endpoint.",
  params: [
    {
      key: "workerId",
      label: "Worker ID",
      type: "string",
      required: true,
      default: "",
      hint: "The worker id, not the HRIS profile id.",
    },
  ],
  output: [{ key: "data", type: "object", label: "Personal information" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const workerId = String(p.workerId ?? "").trim();
    if (!workerId) throw new Error("`workerId` is required");

    ctx.log("info", "getting Deel personal information", { workerId });

    return await new DeelClient(ctx).request(
      `/people/${encodeURIComponent(workerId)}/personal`,
    );
  },
};

export default action;
