import type { ActionDefinition } from "@w6w/types";
import { deviceType, PlaudClient, requireString } from "../lib/client.ts";
import { DEVICE_TYPE_PARAM, SN_PARAM } from "../lib/params.ts";

interface BindResponse {
  type?: string;
  sn?: string;
  is_bind?: boolean;
}

const action: ActionDefinition = {
  key: "device-unbind",
  type: "perform",
  resource: "device",
  title: "Unbind a device (cloud registry)",
  description:
    "Remove a device's owner association in Plaud's cloud registry. Pair it with the SDK's on-device unbind in the mobile app. Unbinding an already-unbound device is idempotent.",
  idempotent: true,
  params: [SN_PARAM, DEVICE_TYPE_PARAM],
  output: [
    { key: "type", type: "string", label: "Device type" },
    { key: "sn", type: "string", label: "Serial number" },
    { key: "isBound", type: "boolean", label: "Remote binding state after the call" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const sn = requireString(p.sn, "sn");
    const type = deviceType(p.type, sn);
    const res = await new PlaudClient(ctx).request<BindResponse>("/open/partner/sdk/unbind", {
      method: "POST",
      body: { type, sn },
    });
    return { type: res.type ?? type, sn: res.sn ?? sn, isBound: res.is_bind ?? null };
  },
};

export default action;
