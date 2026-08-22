import type { ActionDefinition } from "@w6w/types";
import { assertUuid, BalenaClient, DEVICE_STATUS_MEANING, odataString } from "../lib/client.ts";

/**
 * `GET /v7/device(uuid='…')` — one device, in full.
 *
 * ## Three release fields, and they answer three different questions
 *
 * - `is_running__release` — what it is running **now**.
 * - `should_be_running__release` — what it *should* be running: its pin if it
 *   has one, otherwise its fleet's target.
 * - `is_pinned_on__release` — the pin itself, null when the device follows its
 *   fleet.
 *
 * The useful comparison is the first against the second. When they differ the
 * device is mid-update, offline, or stuck — and `download_progress` tells you
 * which. This action does that comparison rather than returning three ids and
 * leaving it to the workflow.
 *
 * ## The metrics are only as fresh as the last heartbeat
 *
 * `cpu_temp`, `memory_usage`, `storage_usage` and the rest are reported by the
 * supervisor. On an offline device they are whatever they were when it last
 * spoke, with nothing marking them stale — so a dashboard reading CPU
 * temperature from a device that died last week shows a plausible number.
 * This action returns the age of the reading alongside it.
 *
 * ## `is_undervolted` is a hardware problem wearing a software costume
 *
 * Set when the board reports low voltage. On a Raspberry Pi it means the power
 * supply, and it presents as random crashes, corrupted storage and services
 * restarting — everything except a power problem.
 */
const action: ActionDefinition = {
  key: "device-get",
  type: "read",
  resource: "device",
  title: "Get a device",
  description:
    "One device, comparing what it IS running against what it SHOULD be — the comparison that " +
    "says whether it is mid-update, offline or stuck. Reports how stale the supervisor metrics " +
    "are, since an offline device keeps returning its last reading.",
  params: [
    {
      key: "uuid",
      label: "Device UUID",
      type: "string",
      required: true,
      default: "",
      hint: "The full 32-character uuid. The dashboard shows a 7-character short form, which " +
        "matches nothing.",
    },
  ],
  output: [
    { key: "device", type: "object", label: "The device" },
    { key: "id", type: "number", label: "Its numeric id, which some endpoints take" },
    { key: "name", type: "string", label: "What it is called" },
    { key: "status", type: "string", label: "The supervisor's view" },
    { key: "statusMeaning", type: "string", label: "What that status actually means" },
    { key: "overallStatus", type: "string", label: "The dashboard's view" },
    { key: "online", type: "boolean", label: "Connected to the VPN" },
    { key: "heartbeat", type: "string", label: "online, offline, timeout or unknown" },
    { key: "onTargetRelease", type: "boolean", label: "Running what it should be" },
    { key: "isPinned", type: "boolean", label: "Ignoring its fleet's target" },
    { key: "downloadProgress", type: "number", label: "Set while a release is downloading" },
    { key: "osVersion", type: "string", label: "balenaOS version" },
    { key: "supervisorVersion", type: "string", label: "Supervisor version" },
    { key: "metricsAgeSeconds", type: "number", label: "How old the CPU and memory figures are" },
    { key: "isUndervolted", type: "boolean", label: "A power supply problem" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const uuid = assertUuid(p.uuid);

    const device = await new BalenaClient(ctx).one<{
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
      download_progress?: number | null;
      is_undervolted?: boolean;
      cpu_temp?: number | null;
      memory_usage?: number | null;
      memory_total?: number | null;
      storage_usage?: number | null;
      is_running__release?: { __id?: number } | null;
      should_be_running__release?: { __id?: number } | null;
      is_pinned_on__release?: { __id?: number } | null;
    }>("device", {
      query: {
        $select: "id,uuid,device_name,status,overall_status,is_online,api_heartbeat_state," +
          "last_connectivity_event,os_version,supervisor_version,download_progress," +
          "is_undervolted,cpu_temp,memory_usage,memory_total,storage_usage," +
          "is_running__release,should_be_running__release,is_pinned_on__release",
        $filter: `uuid eq ${odataString(uuid)}`,
      },
    });

    if (!device) {
      throw new Error(
        `no device has uuid ${uuid}. balena returns an empty list rather than a 404, so this is ` +
          "a device that does not exist, one this credential cannot see, or a short uuid — the " +
          "dashboard displays only the first 7 characters and they do not match",
      );
    }

    const running = device.is_running__release?.__id;
    const target = device.should_be_running__release?.__id;

    // The metrics are as old as the last heartbeat, and nothing marks them so.
    const lastSeen = device.last_connectivity_event
      ? Date.parse(device.last_connectivity_event)
      : NaN;
    const metricsAgeSeconds = device.is_online === true
      ? 0
      : Number.isFinite(lastSeen)
      ? Math.round((Date.now() - lastSeen) / 1000)
      : undefined;

    if (device.is_undervolted) {
      ctx.log(
        "warn",
        "this device reports UNDERVOLTAGE — a power supply problem that presents " +
          "as random crashes, storage corruption and restarting services",
        { uuid },
      );
    }
    if (metricsAgeSeconds && metricsAgeSeconds > 3600) {
      ctx.log(
        "info",
        "the CPU, memory and storage figures are from the device's last heartbeat " +
          "and are stale — balena keeps returning them unchanged",
        { uuid, metricsAgeSeconds },
      );
    }

    return {
      device,
      id: device.id,
      name: device.device_name,
      status: device.status,
      statusMeaning: DEVICE_STATUS_MEANING[String(device.status)] ?? undefined,
      overallStatus: device.overall_status,
      online: device.is_online === true,
      heartbeat: device.api_heartbeat_state,
      onTargetRelease: Boolean(running && target && running === target),
      isPinned: Boolean(device.is_pinned_on__release?.__id),
      downloadProgress: device.download_progress ?? undefined,
      osVersion: device.os_version,
      supervisorVersion: device.supervisor_version,
      metricsAgeSeconds,
      isUndervolted: device.is_undervolted === true,
    };
  },
};

export default action;
