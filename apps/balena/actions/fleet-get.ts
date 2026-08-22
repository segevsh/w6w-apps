import type { ActionDefinition } from "@w6w/types";
import { BalenaClient, odataString } from "../lib/client.ts";

/**
 * `GET /v7/application` for one fleet, with the device counts that make it
 * mean something.
 *
 * ## A fleet's target release is what its unpinned devices will run
 *
 * `should_be_running__release` is the fleet's target. Devices follow it unless
 * they are individually pinned, and `should_track_latest_release` decides
 * whether the target moves on its own when a new release is built.
 *
 * Those two settings answer the question people actually ask — "why is this
 * device not running the new build?" — and the answer is one of three things:
 * the fleet is not tracking latest, the device is pinned, or the device is
 * offline. This action reports the first two and counts the third.
 *
 * ## The counts are the state of the fleet
 *
 * How many devices are online, how many are running something other than the
 * target, how many are pinned. A fleet where half the devices are on an old
 * release is not visible from the fleet record alone.
 */
const action: ActionDefinition = {
  key: "fleet-get",
  type: "read",
  resource: "fleet",
  title: "Get a fleet",
  description:
    "One fleet with the counts that make it legible: how many devices are online, how many are " +
    "running something other than the TARGET RELEASE, and how many are individually PINNED — " +
    "the three reasons a device is not running the new build.",
  params: [
    {
      key: "fleet",
      label: "Fleet",
      type: "string",
      required: true,
      default: "",
      placeholder: "myorg/my-fleet",
      hint: "The slug (`org/fleet`) or the numeric id.",
    },
  ],
  output: [
    { key: "fleet", type: "object", label: "The fleet" },
    { key: "id", type: "number", label: "Its numeric id, which other actions take" },
    { key: "slug", type: "string", label: "`org/fleet`" },
    { key: "deviceType", type: "string", label: "What hardware it builds for" },
    { key: "targetReleaseId", type: "number", label: "What unpinned devices should run" },
    { key: "tracksLatest", type: "boolean", label: "Whether the target moves on a new build" },
    { key: "deviceCount", type: "number", label: "Devices in the fleet" },
    { key: "onlineCount", type: "number", label: "Currently reachable" },
    { key: "pinnedCount", type: "number", label: "Ignoring the fleet's target" },
    { key: "notOnTargetCount", type: "number", label: "Running something else" },
    { key: "isArchived", type: "boolean", label: "Kept for history" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const reference = String(p.fleet ?? "").trim();
    if (!reference) throw new Error("`fleet` is required — a slug like `org/name`, or an id");

    const client = new BalenaClient(ctx);
    const numeric = /^\d+$/.test(reference);
    const fleet = await client.one<{
      id?: number;
      app_name?: string;
      slug?: string;
      is_archived?: boolean;
      should_track_latest_release?: boolean;
      should_be_running__release?: { __id?: number } | null;
      is_for__device_type?: { __id?: number } | null;
    }>("application", {
      query: {
        $select: "id,app_name,slug,is_archived,should_track_latest_release," +
          "should_be_running__release,is_for__device_type",
        $filter: numeric ? `id eq ${Number(reference)}` : `slug eq ${odataString(reference)}`,
      },
    });

    if (!fleet) {
      throw new Error(
        `no fleet matched ${JSON.stringify(reference)}. balena returns an EMPTY LIST rather ` +
          "than a 404 for a filter that matches nothing, so this is a name that does not exist " +
          "or one this credential cannot see — the two are indistinguishable from here",
      );
    }

    const targetReleaseId = fleet.should_be_running__release?.__id;
    const devices = await client.list<{
      is_online?: boolean;
      is_pinned_on__release?: { __id?: number } | null;
      is_running__release?: { __id?: number } | null;
    }>("device", {
      query: {
        $select: "is_online,is_pinned_on__release,is_running__release",
        $filter: `belongs_to__application eq ${fleet.id}`,
      },
    });

    // A device is off the target because it is pinned, because the fleet is
    // not tracking latest, or because it is offline. All three are visible.
    const pinned = devices.filter((device) => device?.is_pinned_on__release?.__id);
    const notOnTarget = targetReleaseId
      ? devices.filter((device) => device?.is_running__release?.__id !== targetReleaseId)
      : [];

    return {
      fleet,
      id: fleet.id,
      slug: fleet.slug,
      deviceType: fleet.is_for__device_type?.__id
        ? String(fleet.is_for__device_type.__id)
        : undefined,
      targetReleaseId,
      tracksLatest: fleet.should_track_latest_release !== false,
      deviceCount: devices.length,
      onlineCount: devices.filter((device) => device?.is_online === true).length,
      pinnedCount: pinned.length,
      notOnTargetCount: notOnTarget.length,
      isArchived: fleet.is_archived === true,
    };
  },
};

export default action;
