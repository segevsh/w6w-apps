import type { ActionDefinition } from "@w6w/types";
import { deviceType, PlaudClient, requireString } from "../lib/client.ts";
import { DEVICE_TYPE_PARAM, SN_PARAM } from "../lib/params.ts";

interface BindingResponse {
  is_bind?: boolean | null;
  bind_history?: string[];
}

const action: ActionDefinition = {
  key: "device-binding-get",
  type: "read",
  resource: "device",
  title: "Get a device's binding state",
  description:
    "Read a device's remote binding state and every client id it was previously bound to (including other apps). `isBound` is three-state: true = bound to another account, false = unbound, null = never bound.",
  params: [SN_PARAM, DEVICE_TYPE_PARAM],
  output: [
    { key: "isBound", type: "boolean", label: "true, false, or null (never bound)" },
    { key: "bindHistory", type: "array", label: "Client ids, newest first, de-duplicated" },
    {
      key: "bindEvents",
      type: "number",
      label: "Raw bind events recorded (before de-duplication)",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const sn = requireString(p.sn, "sn");
    const type = deviceType(p.type, sn);
    const res = await new PlaudClient(ctx).request<BindingResponse>("/open/partner/sdk/binding", {
      query: { type, sn },
    });
    const raw = Array.isArray(res.bind_history) ? res.bind_history.map(String) : [];
    return {
      isBound: res.is_bind ?? null,
      // One entry is recorded per bind EVENT, so a client id can repeat.
      bindHistory: [...new Set(raw)],
      bindEvents: raw.length,
    };
  },
};

export default action;
