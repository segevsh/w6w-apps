import type { ActionDefinition } from "@w6w/types";
import { deviceType, PlaudClient, requireString } from "../lib/client.ts";
import { DEVICE_TYPE_PARAM, SN_PARAM } from "../lib/params.ts";

interface BindResponse {
  type?: string;
  sn?: string;
  is_bind?: boolean;
}

const action: ActionDefinition = {
  key: "device-bind",
  type: "perform",
  resource: "device",
  title: "Bind a device (cloud registry)",
  description:
    "Register a Plaud device to this connection's user in Plaud's cloud registry. This is only the cloud half of binding: the on-device (Bluetooth) bind is done by the Embedded SDK in a mobile app. Re-binding to the same owner is idempotent; a device bound to another account answers 403.",
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
    const res = await new PlaudClient(ctx).request<BindResponse>("/open/partner/sdk/bind", {
      method: "POST",
      body: { type, sn },
    });
    return { type: res.type ?? type, sn: res.sn ?? sn, isBound: res.is_bind ?? null };
  },
};

export default action;
