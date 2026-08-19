import type { ActionDefinition } from "@w6w/types";
import { BalenaClient, DEVICE_STATUS_MEANING, odataString } from "../lib/client.ts";

/**
 * `GET /v7/device` — the fleet, device by device.
 *
 * ## `is_online` and `api_heartbeat_state` disagree, and the second is truer
 *
 * `is_online` is a boolean the VPN connection sets. `api_heartbeat_state` is
 * one of `online`, `offline`, `timeout` or `unknown`, and `timeout` is the
 * interesting one: the device was talking recently and has now gone quiet, but
 * not long enough to be declared offline.
 *
 * On a fleet of cellular devices that state is most of the fleet most of the
 * time, and treating it as offline produces an alert storm about devices that
 * are working. This action returns both and separates `timeout` from genuinely
 * offline.
 *
 * ## `overall_status` is only returned when you ask for it
 *
 * balena's own documentation: "The overall_status field is returned only when
 * explicitly requested with $select." So a plain fetch gives `status` — which
 * is the supervisor's view — and silently omits the field the dashboard
 * actually displays. This action requests both.
 *
 * ## `status: "configuring"` is not an error and looks like one
 *
 * A device that has connected but not finished provisioning sits in
 * `configuring` with a `provisioning_progress` percentage. It is not broken;
 * it is ten minutes old.
 */
const action: ActionDefinition = {
  key: "device-list",
  type: "search",
  resource: "device",
  title: "List devices",
  description:
    "Devices, with the two health fields balena reports separately: `is_online` from the VPN and " +
    "`api_heartbeat_state`, whose `timeout` value is a device that has gone quiet rather than " +
    "one that is gone. Requests `overall_status`, which balena omits unless asked.",
  params: [
    {
      key: "fleet",
      label: "Fleet",
      type: "string",
      default: "",
      placeholder: "myorg/my-fleet",
      hint: "Slug or numeric id. Empty means every device this credential can see.",
    },
    {
      key: "state",
      label: "State",
      type: "select",
      default: "all",
      options: [
        { value: "all", label: "All devices" },
        { value: "online", label: "Online" },
        { value: "offline", label: "Offline" },
      ],
    },
    {
      key: "nameContains",
      label: "Name contains",
      type: "string",
      default: "",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 200,
      hint: "balena pages with `$top`. A large fleet returns a large response.",
    },
  ],
  output: [
    { key: "devices", type: "array", label: "The devices" },
    { key: "count", type: "number", label: "How many came back" },
    { key: "uuids", type: "array", label: "Full uuids — the short form matches nothing" },
    { key: "onlineCount", type: "number", label: "Connected to the VPN" },
    { key: "heartbeatTimeout", type: "array", label: "Gone quiet, not yet declared offline" },
    { key: "offline", type: "array", label: "No heartbeat at all" },
    { key: "configuring", type: "array", label: "Provisioning — new, not broken" },
    { key: "updating", type: "array", label: "Downloading or applying a release" },
    { key: "statusCounts", type: "object", label: "How many devices in each status" },
    { key: "undervolted", type: "array", label: "Reporting an undervoltage — a power problem" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new BalenaClient(ctx);

    const filters: string[] = [];
    const fleet = String(p.fleet ?? "").trim();
    if (fleet) {
      filters.push(
        /^\d+$/.test(fleet)
          ? `belongs_to__application eq ${Number(fleet)}`
          : `belongs_to__application/any(a:a/slug eq ${odataString(fleet)})`,
      );
    }
    const state = String(p.state ?? "all");
    if (state === "online") filters.push("is_online eq true");
    if (state === "offline") filters.push("is_online eq false");
    const name = String(p.nameContains ?? "").trim();
    if (name) filters.push(`contains(device_name,${odataString(name)})`);

    const devices = await client.list<{
      id?: number;
      uuid?: string;
      device_name?: string;
      status?: string;
      overall_status?: string;
      is_online?: boolean;
      api_heartbeat_state?: string;
      last_connectivity_event?: string;
      os_version?: string;
      supervisor_version?: string;
      is_undervolted?: boolean;
      provisioning_progress?: number | null;
      is_pinned_on__release?: { __id?: number } | null;
    }>("device", {
      query: {
        // `overall_status` is omitted unless it is named here.
        $select: "id,uuid,device_name,status,overall_status,is_online,api_heartbeat_state," +
          "last_connectivity_event,os_version,supervisor_version,is_undervolted," +
          "provisioning_progress,is_pinned_on__release",
        $filter: filters.length ? filters.join(" and ") : undefined,
        $orderby: "device_name asc",
        $top: Math.max(1, Math.min(1000, Number(p.limit ?? 200))),
      },
    });

    const label = (device: { device_name?: string; uuid?: string }) =>
      device?.device_name ?? device?.uuid ?? "(unnamed)";
    const withStatus = (status: string) => devices.filter((device) => device?.status === status);

    const statusCounts: Record<string, number> = {};
    for (const device of devices) {
      const status = String(device?.status ?? "unknown");
      statusCounts[status] = (statusCounts[status] ?? 0) + 1;
    }

    const unrecognised = Object.keys(statusCounts).filter((status) =>
      !(status in DEVICE_STATUS_MEANING) && status !== "unknown"
    );
    if (unrecognised.length) {
      ctx.log(
        "info",
        "balena reported device statuses this app does not have a description " +
          "for — they are passed through unchanged",
        { statuses: unrecognised },
      );
    }

    return {
      devices,
      count: devices.length,
      uuids: devices.map((device) => device?.uuid).filter(Boolean),
      onlineCount: devices.filter((device) => device?.is_online === true).length,
      // Gone quiet, and not the same as gone.
      heartbeatTimeout: devices
        .filter((device) => device?.api_heartbeat_state === "timeout")
        .map(label),
      offline: devices
        .filter((device) =>
          device?.api_heartbeat_state === "offline" || device?.is_online === false
        )
        .map((device) => ({
          name: label(device),
          uuid: device?.uuid,
          lastSeen: device?.last_connectivity_event,
        })),
      configuring: withStatus("configuring").map((device) => ({
        name: label(device),
        progress: device?.provisioning_progress,
      })),
      updating: withStatus("updating").map(label),
      statusCounts,
      // A power supply problem that presents as random instability.
      undervolted: devices.filter((device) => device?.is_undervolted === true).map(label),
    };
  },
};

export default action;
