import { pollSnapshot } from "../../_shared/poll/mod.ts";
import type { TriggerDefinition } from "@w6w/types";
import action from "../actions/device-list.ts";

/**
 * `GET /v1/devices` returns the account's whole device collection in one unpaged array, sorted by
 * `last_handshake_at` (not by claim time), so "new" is a snapshot diff on device id, not a
 * newest-first page. The kit refuses more than 5000 rows.
 */
const trigger: TriggerDefinition = {
  key: "new-device",
  title: "New Device",
  description: "The run gets each device newly claimed to the Particle account.",
  minIntervalMs: 300_000,
  output: [
    { key: "id", type: "string", label: "Device ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "product_id", type: "number", label: "Product ID" },
    { key: "platform_id", type: "number", label: "Platform ID" },
    { key: "online", type: "boolean", label: "Connected right now" },
    { key: "last_heard", type: "string", label: "Last heard from" },
  ],
  sample: {
    id: "53ff6f0650723",
    name: "plumber_laser",
    product_id: 6,
    platform_id: 6,
    online: true,
    last_heard: "2026-11-09T14:46:07.586Z",
  },
  async poll({ state }, ctx) {
    const res = await action.execute({}, ctx) as { devices?: Array<Record<string, unknown>> };
    const devices = (res.devices ?? []).filter((d) => typeof d.id === "string" && d.id !== "");
    const { events, nextState } = await pollSnapshot({
      state,
      rows: devices.map((d) => ({ key: String(d.id), values: d })),
      emit: { added: true, updated: false, removed: false },
    });
    return { events: events.map((e) => e.values), nextState };
  },
};

export default trigger;
