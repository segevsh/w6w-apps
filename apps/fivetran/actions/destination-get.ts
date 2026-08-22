import type { ActionDefinition } from "@w6w/types";
import { FivetranClient } from "../lib/client.ts";

/**
 * `GET /v1/destinations/{id}` — one warehouse in full.
 *
 * Worth the individual call for two fields. **`region`** is where the data
 * physically lands, which is a compliance answer rather than a technical one —
 * and it cannot be changed after creation, so a destination in the wrong region
 * is a rebuild rather than a setting.
 *
 * **`time_zone_offset`** decides when "daily" means, which is the quiet cause
 * of a report that is consistently an hour out or that misses the last hour of
 * a day.
 *
 * Secrets in `config` are redacted by Fivetran.
 */
const action: ActionDefinition = {
  key: "destination-get",
  type: "read",
  resource: "destination",
  title: "Get a destination",
  description:
    "One warehouse, with the region data physically lands in — a compliance answer, and one " +
    "that cannot be changed after creation.",
  params: [
    {
      key: "destinationId",
      label: "Destination ID",
      type: "string",
      required: true,
      default: "",
      hint: "The same id as the group's.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Destination ID" },
    { key: "service", type: "string", label: "Which warehouse — snowflake, big_query, …" },
    { key: "region", type: "string", label: "Where the data physically lands" },
    { key: "setup_status", type: "string", label: "Whether it is connected" },
    { key: "time_zone_offset", type: "string", label: "What 'daily' means here" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const destinationId = String(p.destinationId ?? "").trim();
    if (!destinationId) throw new Error("`destinationId` is required");
    return await new FivetranClient(ctx).request(
      `/v1/destinations/${encodeURIComponent(destinationId)}`,
    );
  },
};

export default action;
