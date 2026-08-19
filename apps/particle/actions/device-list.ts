import type { ActionDefinition } from "@w6w/types";
import { ParticleClient, query } from "../lib/client.ts";
import { PRODUCT_PARAM } from "../lib/params.ts";

/**
 * `GET /v1/devices` — the account's devices, or a product's fleet.
 *
 * ## `connected` is not a health metric
 *
 * A battery-powered sensor that wakes for four seconds an hour is offline
 * ninety-nine per cent of the time and working perfectly. A mains-powered
 * gateway that is offline is broken. The API cannot tell them apart and neither
 * can this action — so it reports the count and `last_heard` rather than
 * calling anything unhealthy, and leaves the judgement to a workflow that knows
 * what the hardware is.
 *
 * What *is* worth flagging: a device whose `last_heard` is old **relative to
 * every other device in the fleet**. That is a comparison the API does not make
 * and a workflow usually wants.
 *
 * ## Firmware version drift is the other fleet-wide question
 *
 * `system_firmware_version` is Device OS. A fleet spread across several
 * versions behaves differently device to device — the function argument limit
 * alone varies with it — so the distinct versions come back as a set.
 */
const action: ActionDefinition = {
  key: "device-list",
  type: "search",
  resource: "device",
  title: "List devices",
  description:
    "The account's claimed devices, or a product's fleet. `connected` is NOT a health metric — a " +
    "sleeping sensor is offline and fine — so this reports the counts and the last-heard spread " +
    "rather than judging.",
  params: [
    PRODUCT_PARAM,
    {
      key: "name",
      label: "Name Contains",
      type: "string",
      default: "",
      hint: "Matched here, case-insensitively.",
    },
    {
      key: "perPage",
      label: "Page Size",
      type: "number",
      default: 100,
      showIf: { "!=": [{ var: "product" }, ""] },
      hint: "Product fleets page; an account's own device list does not.",
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      default: 1,
      showIf: { "!=": [{ var: "product" }, ""] },
    },
  ],
  output: [
    { key: "devices", type: "array", label: "The devices" },
    { key: "count", type: "number", label: "Matching" },
    { key: "ids", type: "array", label: "Just the device ids" },
    { key: "onlineCount", type: "number", label: "How many are connected right now" },
    { key: "offlineCount", type: "number", label: "How many are not — often by design" },
    { key: "quietest", type: "object", label: "The device heard from longest ago" },
    {
      key: "firmwareVersions",
      type: "array",
      label: "The distinct Device OS versions in the fleet",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const product = String(p.product ?? "").trim();

    const path = product ? `/v1/products/${encodeURIComponent(product)}/devices` : "/v1/devices";
    const response = await new ParticleClient(ctx).request<
      | Array<Record<string, unknown>>
      | { devices?: Array<Record<string, unknown>> }
    >(path, {
      query: product
        ? query({
          per_page: Math.min(1000, Math.max(1, Number(p.perPage ?? 100))),
          page: Math.max(1, Number(p.page ?? 1)),
        })
        : undefined,
    });

    // An account's devices come back as a bare array; a product's are wrapped.
    const all = Array.isArray(response) ? response : (response?.devices ?? []);
    const needle = String(p.name ?? "").trim().toLowerCase();
    const devices = needle
      ? all.filter((device) => String(device?.name ?? "").toLowerCase().includes(needle))
      : all;

    const online = devices.filter((device) => device?.connected === true);
    // The comparison the API does not make: which device has gone quietest.
    const withTimes = devices
      .filter((device) => typeof device?.last_heard === "string")
      .sort((a, b) => String(a.last_heard).localeCompare(String(b.last_heard)));

    ctx.log("info", "listed Particle devices", {
      count: devices.length,
      onlineCount: online.length,
    });

    return {
      devices,
      count: devices.length,
      ids: devices.map((device) => device?.id).filter(Boolean),
      onlineCount: online.length,
      offlineCount: devices.length - online.length,
      quietest: withTimes[0],
      firmwareVersions: [
        ...new Set(
          devices.map((device) => device?.system_firmware_version).filter(Boolean) as string[],
        ),
      ].sort(),
    };
  },
};

export default action;
