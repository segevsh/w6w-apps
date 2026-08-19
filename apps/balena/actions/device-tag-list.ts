import type { ActionDefinition } from "@w6w/types";
import { BalenaClient, odataString } from "../lib/client.ts";

/**
 * `GET /v7/device_tag` — read tags for one device, or find every device
 * carrying one.
 *
 * ## Searching by tag is how a workflow addresses a subset of a fleet
 *
 * "Every device tagged `site=berlin`" is a question balena can answer, and it
 * is the closest thing to a sub-fleet the platform has. That makes this the
 * companion to `device-tag-set`: one records what a device is, the other finds
 * them again.
 *
 * ## A tag value is a string, always
 *
 * `1`, `true` and `2026-08-19` are all strings, and the filter is an exact
 * match. `version=2` does not match a device tagged `version=2.0`, which is
 * the sort of thing that looks like a missing device.
 */
const action: ActionDefinition = {
  key: "device-tag-list",
  type: "search",
  resource: "tag",
  title: "List device tags",
  description:
    "Tags for one device, or every device carrying a given tag — the closest thing balena has " +
    "to a sub-fleet. Values are always STRINGS matched exactly, so `version=2` does not find a " +
    "device tagged `version=2.0`.",
  params: [
    {
      key: "uuid",
      label: "Device UUID",
      type: "string",
      default: "",
      hint: "Tags for this one device. Leave empty to search across devices by key and value.",
    },
    {
      key: "key",
      label: "Tag key",
      type: "string",
      default: "",
      placeholder: "site",
    },
    {
      key: "value",
      label: "Tag value",
      type: "string",
      default: "",
      hint: "An exact match. Everything is a string here.",
    },
    {
      key: "fleet",
      label: "Fleet",
      type: "string",
      default: "",
      hint: "Narrow a tag search to one fleet.",
    },
  ],
  output: [
    { key: "tags", type: "array", label: "The matching tags" },
    { key: "count", type: "number", label: "How many" },
    { key: "devices", type: "array", label: "The devices carrying them" },
    { key: "deviceCount", type: "number", label: "How many distinct devices" },
    { key: "byKey", type: "object", label: "Key to value, for a single-device read" },
    { key: "values", type: "array", label: "The distinct values seen for the key" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const uuid = String(p.uuid ?? "").trim().toLowerCase();
    const key = String(p.key ?? "").trim();
    const value = String(p.value ?? "").trim();
    const fleet = String(p.fleet ?? "").trim();

    if (!uuid && !key) {
      throw new Error(
        "give a `uuid` to read one device's tags, or a `key` to find every device carrying it — " +
          "an unfiltered tag listing is every tag in every fleet this credential can see",
      );
    }

    const filters: string[] = [];
    if (uuid) filters.push(`device/any(d:d/uuid eq ${odataString(uuid)})`);
    if (key) filters.push(`tag_key eq ${odataString(key)}`);
    if (value) filters.push(`value eq ${odataString(value)}`);
    if (fleet) {
      filters.push(
        /^\d+$/.test(fleet)
          ? `device/any(d:d/belongs_to__application eq ${Number(fleet)})`
          : `device/any(d:d/belongs_to__application/any(a:a/slug eq ${odataString(fleet)}))`,
      );
    }

    const tags = await new BalenaClient(ctx).list<{
      id?: number;
      tag_key?: string;
      value?: string;
      device?: { __id?: number } | null;
    }>("device_tag", {
      query: { $select: "id,tag_key,value,device", $filter: filters.join(" and ") },
    });

    const deviceIds = [
      ...new Set(tags.map((tag) => tag?.device?.__id).filter(Boolean) as number[]),
    ];

    const byKey: Record<string, string> = {};
    if (uuid) {
      for (const tag of tags) {
        if (tag?.tag_key) byKey[tag.tag_key] = String(tag.value ?? "");
      }
    }

    return {
      tags,
      count: tags.length,
      devices: deviceIds,
      deviceCount: deviceIds.length,
      byKey,
      values: [...new Set(tags.map((tag) => tag?.value).filter(Boolean) as string[])].sort(),
    };
  },
};

export default action;
