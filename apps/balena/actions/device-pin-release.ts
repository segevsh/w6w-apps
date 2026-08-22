import type { ActionDefinition } from "@w6w/types";
import { assertUuid, BalenaClient, odataString } from "../lib/client.ts";

/**
 * `PATCH /v7/device(uuid='…')` with `is_pinned_on__release`.
 *
 * ## Pinning is how a canary deployment works on balena
 *
 * A pinned device runs the release it is pinned to and ignores its fleet's
 * target entirely. Pin one device to a new release, watch it, then move the
 * fleet — that is the whole pattern, and it is the reason this action exists.
 *
 * ## Unpinning is not "go back", it is "follow the fleet"
 *
 * Setting the pin to null makes the device track its fleet's target again,
 * which may be newer or older than what it is running. A workflow that pins
 * for a canary and unpins to roll back is relying on the fleet target still
 * being the old release — true right up until somebody moves it.
 *
 * ## A release has to belong to the device's own fleet
 *
 * balena rejects a pin to a release from a different fleet, and the message is
 * about the release rather than about the mismatch. This checks first.
 *
 * ## An invalidated release can still be pinned
 *
 * `is_invalidated` marks a release withdrawn — usually because it was found to
 * be broken. balena will let a device be pinned to one anyway, so this warns.
 */
const action: ActionDefinition = {
  key: "device-pin-release",
  type: "perform",
  resource: "device",
  title: "Pin or unpin a device's release",
  description:
    "Pin a device to a specific release — the canary pattern — or unpin it to follow its " +
    "fleet's target again. Note UNPINNING is not a rollback: it means whatever the fleet " +
    "currently targets, which may be newer than what the device runs.",
  idempotent: true,
  params: [
    { key: "uuid", label: "Device UUID", type: "string", required: true, default: "" },
    {
      key: "release",
      label: "Release",
      type: "string",
      default: "",
      placeholder: "a1b2c3d… or 2.1.0",
      hint: "A release commit or its numeric id. Leave empty to UNPIN, which makes the device " +
        "follow its fleet's target — not necessarily the release it is running now.",
    },
  ],
  output: [
    { key: "uuid", type: "string", label: "Which device" },
    { key: "pinnedReleaseId", type: "number", label: "What it is pinned to now" },
    { key: "previousPinId", type: "number", label: "What it was pinned to" },
    { key: "commit", type: "string", label: "The release's commit" },
    { key: "pinned", type: "boolean", label: "Whether it is pinned at all" },
    { key: "changed", type: "boolean", label: "Whether anything changed" },
    { key: "willFollowFleetTarget", type: "boolean", label: "True after unpinning" },
    { key: "releaseInvalidated", type: "boolean", label: "Pinned to a withdrawn release" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const uuid = assertUuid(p.uuid);
    const reference = String(p.release ?? "").trim();

    const client = new BalenaClient(ctx);
    const device = await client.one<{
      id?: number;
      belongs_to__application?: { __id?: number } | null;
      is_pinned_on__release?: { __id?: number } | null;
    }>("device", {
      query: {
        $select: "id,belongs_to__application,is_pinned_on__release",
        $filter: `uuid eq ${odataString(uuid)}`,
      },
    });
    if (!device) throw new Error(`no device has uuid ${uuid}`);
    const previousPinId = device.is_pinned_on__release?.__id;

    // Unpin: follow the fleet, wherever the fleet now points.
    if (!reference) {
      await client.request(`/v7/device(uuid=${odataString(uuid)})`, {
        method: "PATCH",
        body: { is_pinned_on__release: null },
      });
      ctx.log(
        "info",
        "unpinned a device — it now follows its fleet's target release, which is " +
          "not necessarily the release it is running",
        { uuid },
      );
      return {
        uuid,
        pinnedReleaseId: undefined,
        previousPinId,
        commit: undefined,
        pinned: false,
        changed: Boolean(previousPinId),
        willFollowFleetTarget: true,
        releaseInvalidated: false,
      };
    }

    const fleetId = device.belongs_to__application?.__id;
    const release = await client.one<{
      id?: number;
      commit?: string;
      status?: string;
      is_invalidated?: boolean;
      belongs_to__application?: { __id?: number } | null;
    }>("release", {
      query: {
        $select: "id,commit,status,is_invalidated,belongs_to__application",
        $filter: /^\d+$/.test(reference)
          ? `id eq ${Number(reference)}`
          : `commit eq ${odataString(reference)} or raw_version eq ${odataString(reference)}`,
      },
    });
    if (!release) {
      throw new Error(
        `no release matched ${JSON.stringify(reference)} — give a full commit hash, a version ` +
          "like `2.1.0`, or a numeric release id. `release-list` reports all three",
      );
    }

    // balena's own refusal names the release rather than the mismatch.
    if (fleetId && release.belongs_to__application?.__id !== fleetId) {
      throw new Error(
        `release ${release.commit ?? release.id} belongs to a different fleet than this device. ` +
          "balena only pins a device to a release built for its own fleet — moving the device " +
          "first, with `device-move`, is the other way round",
      );
    }
    if (release.status && release.status !== "success") {
      throw new Error(
        `release ${release.commit ?? release.id} has status ${release.status} — pinning a device ` +
          "to a release that did not build successfully leaves it with nothing to download",
      );
    }
    if (release.is_invalidated) {
      ctx.log(
        "warn",
        "this release has been INVALIDATED — usually because it was found to be " +
          "broken — and balena still allows a device to be pinned to it",
        { uuid },
      );
    }

    await client.request(`/v7/device(uuid=${odataString(uuid)})`, {
      method: "PATCH",
      body: { is_pinned_on__release: release.id },
    });

    return {
      uuid,
      pinnedReleaseId: release.id,
      previousPinId,
      commit: release.commit,
      pinned: true,
      changed: previousPinId !== release.id,
      willFollowFleetTarget: false,
      releaseInvalidated: release.is_invalidated === true,
    };
  },
};

export default action;
