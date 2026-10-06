import type { ActionDefinition } from "@w6w/types";
import { jsonValue, USER, WakaClient } from "../lib/client.ts";

interface Input {
  heartbeats: unknown;
}

/** `POST /api/v1/users/current/heartbeats.bulk` */
const heartbeatsBulkCreate: ActionDefinition<Input> = {
  key: "heartbeats-bulk-create",
  type: "perform",
  resource: "heartbeat",
  title: "Create Heartbeats (Bulk)",
  description:
    "Send up to 25 heartbeats in one request, as a JSON array of heartbeat objects (entity, type, time and the same optional fields as Create Heartbeat).",
  idempotent: false,
  params: [
    {
      key: "heartbeats",
      label: "Heartbeats",
      type: "json",
      required: true,
      hint:
        'JSON array, at most 25 items, e.g. [{"entity":"/a.ts","type":"file","time":1790000000}].',
    },
  ],
  output: [
    { key: "responses", type: "array", label: "One response per heartbeat" },
  ],

  execute(input, ctx) {
    const list = jsonValue(input.heartbeats);
    if (!Array.isArray(list) || list.length === 0) {
      throw new Error("Heartbeats must be a non-empty JSON array");
    }
    if (list.length > 25) throw new Error("WakaTime accepts at most 25 heartbeats per request");
    return new WakaClient(ctx).request("POST", `${USER}/heartbeats.bulk`, {
      body: list,
    });
  },
};

export default heartbeatsBulkCreate;
