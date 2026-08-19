import type { ActionDefinition } from "@w6w/types";
import { assertTags, csv, TailscaleClient } from "../lib/client.ts";

/**
 * `POST /api/v2/device/{deviceId}/tags` — give a machine an identity that is
 * not a person's.
 *
 * ## Tagging transfers ownership, and that is the point
 *
 * Tailscale's own words: "Once a device is tagged, the tag is the owner of that
 * device." The user who registered it stops owning it, ACL rules written
 * against `tag:prod` start applying, and rules written against that user stop.
 *
 * Two consequences that surprise people:
 *
 * - **A tagged device's key stops expiring.** Tagged machines are servers, and
 *   servers do not have somebody to re-authenticate them. That is usually what
 *   you want and it is also a device that will never be forced to prove itself
 *   again.
 * - **Untagging does not restore the old owner.** The device becomes ownerless
 *   rather than returning to the person who set it up.
 *
 * ## This REPLACES the tag list
 *
 * There is no add-a-tag endpoint. Sending `["tag:web"]` to a device tagged
 * `["tag:web","tag:prod"]` removes `tag:prod` — and with it every ACL rule
 * that depended on it. So this action reads the current tags first, reports
 * both lists, and offers an explicit `mode: add` that merges rather than
 * replacing.
 *
 * ## The tag must exist in the policy file first
 *
 * A tag has to be declared with an owner in the tailnet policy file before any
 * device can carry it. Tailscale rejects an undeclared tag, and it rejects a
 * bare `web` in a way that reads the same — so `assertTags` checks the `tag:`
 * prefix here, where the message can say which mistake it is.
 */
const action: ActionDefinition = {
  key: "device-tags-set",
  type: "perform",
  resource: "device",
  title: "Set a device's tags",
  description:
    "Tag a machine, which TRANSFERS OWNERSHIP from the user who registered it to the tag and " +
    "stops its key expiring. Tailscale REPLACES the whole tag list, so `mode: add` merges with " +
    "what is already there rather than quietly dropping it.",
  idempotent: true,
  params: [
    {
      key: "deviceId",
      label: "Device ID",
      type: "string",
      required: true,
      default: "",
    },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      required: true,
      default: "",
      placeholder: "tag:prod, tag:web",
      hint: "Each must be `tag:name` and must already be declared, with an owner, in the tailnet " +
        "policy file.",
    },
    {
      key: "mode",
      label: "Mode",
      type: "select",
      default: "replace",
      options: [
        { value: "replace", label: "Replace — these become the device's only tags" },
        { value: "add", label: "Add — merge with the tags it already has" },
        { value: "remove", label: "Remove — take these off, leave the rest" },
      ],
      hint: "Tailscale itself only replaces; add and remove are done by reading first.",
    },
  ],
  output: [
    { key: "deviceId", type: "string", label: "Which device" },
    { key: "tags", type: "array", label: "The tags it now carries" },
    { key: "previousTags", type: "array", label: "What it carried before" },
    { key: "added", type: "array", label: "Newly applied" },
    { key: "removed", type: "array", label: "Taken away, with any ACL rules that used them" },
    { key: "changed", type: "boolean", label: "Whether anything actually changed" },
    {
      key: "nowOwnedByTag",
      type: "boolean",
      label: "True once tagged — the user no longer owns it",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const deviceId = String(p.deviceId ?? "").trim();
    if (!deviceId) throw new Error("`deviceId` is required");

    const requested = csv(p.tags) ?? [];
    if (!requested.length) {
      throw new Error(
        "`tags` must name at least one tag. To remove every tag, use `mode: remove` with the " +
          "tags the device currently carries — an empty list here is more often a mistake than " +
          "an intention, and it would hand the device back to nobody",
      );
    }
    assertTags(requested, "tags");

    const client = new TailscaleClient(ctx);
    const before = await client.request<{ tags?: string[]; user?: string }>(
      `/device/${encodeURIComponent(deviceId)}`,
    );
    const previousTags = before?.tags ?? [];

    const mode = String(p.mode ?? "replace");
    let tags: string[];
    if (mode === "add") {
      tags = [...new Set([...previousTags, ...requested])];
    } else if (mode === "remove") {
      tags = previousTags.filter((tag) => !requested.includes(tag));
    } else {
      tags = [...new Set(requested)];
    }

    const removed = previousTags.filter((tag) => !tags.includes(tag));
    const added = tags.filter((tag) => !previousTags.includes(tag));

    if (removed.length) {
      ctx.log(
        "warn",
        "removing tags from a device also removes every ACL rule written against " +
          "them, which is a change to what that machine can reach",
        { deviceId, removed },
      );
    }
    if (!previousTags.length && tags.length) {
      ctx.log(
        "info",
        "this device is now owned by its tags rather than by the user who " +
          "registered it, and its key will stop expiring",
        { deviceId },
      );
    }

    await client.request(`/device/${encodeURIComponent(deviceId)}/tags`, {
      method: "POST",
      body: { tags },
    });

    return {
      deviceId,
      tags,
      previousTags,
      added,
      removed,
      changed: added.length > 0 || removed.length > 0,
      nowOwnedByTag: tags.length > 0,
    };
  },
};

export default action;
