import type { ActionDefinition } from "@w6w/types";
import { assertUuid, BalenaClient, odataString } from "../lib/client.ts";

/**
 * Set or remove a device tag.
 *
 * `POST /v7/device_tag`, `PATCH /v7/device_tag(device=…,tag_key='…')`,
 * `DELETE /v7/device_tag(id)`.
 *
 * ## Tags are how a fleet gets a structure balena does not give it
 *
 * balena has fleets and devices and nothing in between. Tags are the way a
 * thousand devices become "the ones in the Berlin warehouse" or "the ones on
 * the new hardware revision" — arbitrary key/value pairs, filterable, and the
 * only grouping mechanism there is short of splitting the fleet.
 *
 * That makes them worth setting from a workflow: a device provisions, an
 * inventory system knows where it went, and a tag records it while the
 * information is still to hand.
 *
 * ## Unlike environment variables, a tag changes nothing on the device
 *
 * No container restarts, nothing is redeployed, the device does not even need
 * to be online. Tags live entirely in balena's database. That is the practical
 * difference from `device-env-set`, and it is why tagging is the safe way to
 * record something about a device.
 *
 * ## The composite key is `(device, tag_key)`
 *
 * balena's PATCH path names both, which is why this action can address a tag
 * without knowing its numeric id — and why setting the same key twice updates
 * rather than duplicating.
 */
const action: ActionDefinition = {
  key: "device-tag-set",
  type: "perform",
  resource: "tag",
  title: "Set a device tag",
  description:
    "Set or remove a tag — balena's only grouping between a fleet and a device, and the way a " +
    "thousand devices become 'the ones in Berlin'. Unlike an environment variable a tag " +
    "RESTARTS NOTHING and does not need the device online.",
  idempotent: true,
  params: [
    { key: "uuid", label: "Device UUID", type: "string", required: true, default: "" },
    {
      key: "key",
      label: "Tag key",
      type: "string",
      required: true,
      default: "",
      placeholder: "site",
    },
    { key: "value", label: "Value", type: "string", default: "" },
    {
      key: "remove",
      label: "Remove it",
      type: "boolean",
      default: false,
    },
  ],
  output: [
    { key: "uuid", type: "string", label: "Which device" },
    { key: "key", type: "string", label: "Which tag" },
    { key: "value", type: "string", label: "What it is now" },
    { key: "previousValue", type: "string", label: "What it was" },
    { key: "action", type: "string", label: "created, updated, removed or unchanged" },
    { key: "changed", type: "boolean", label: "Whether anything changed" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const uuid = assertUuid(p.uuid);
    const key = String(p.key ?? "").trim();
    if (!key) throw new Error("`key` is required");

    const client = new BalenaClient(ctx);
    const device = await client.one<{ id?: number }>("device", {
      query: { $select: "id", $filter: `uuid eq ${odataString(uuid)}` },
    });
    if (!device) throw new Error(`no device has uuid ${uuid}`);

    const existing = await client.one<{ id?: number; value?: string }>("device_tag", {
      query: {
        $select: "id,value",
        $filter: `device eq ${device.id} and tag_key eq ${odataString(key)}`,
      },
    });

    let result: string;
    const value = String(p.value ?? "");
    if (p.remove === true) {
      if (!existing?.id) {
        result = "unchanged";
      } else {
        await client.request(`/v7/device_tag(${existing.id})`, { method: "DELETE" });
        result = "removed";
      }
    } else if (!existing?.id) {
      await client.request("/v7/device_tag", {
        method: "POST",
        body: { device: device.id, tag_key: key, value },
      });
      result = "created";
    } else if (String(existing.value ?? "") === value) {
      result = "unchanged";
    } else {
      // The composite key addresses the row without its numeric id.
      await client.request(
        `/v7/device_tag(device=${device.id},tag_key=${odataString(key)})`,
        { method: "PATCH", body: { value } },
      );
      result = "updated";
    }

    return {
      uuid,
      key,
      value: p.remove === true ? undefined : value,
      previousValue: existing?.value,
      action: result,
      changed: result !== "unchanged",
    };
  },
};

export default action;
