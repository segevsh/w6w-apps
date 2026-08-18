import type { ActionDefinition } from "@w6w/types";
import { CloudinaryClient, csv } from "../lib/client.ts";
import { RESOURCE_TYPE_PARAM } from "../lib/params.ts";

/**
 * `POST /{resource_type}/tags` — add, remove or replace a tag across many
 * assets at once.
 *
 * This is the **additive** route, and the reason `asset-update`'s tag field
 * carries a warning: that one replaces an asset's whole tag set, while this one
 * changes a single tag on up to 1000 assets and leaves their other tags alone.
 *
 * The four commands are not symmetrical, and the difference matters:
 *
 *   - `add` — adds the tag to the named assets.
 *   - `remove` — removes it from them.
 *   - `replace` — **replaces every tag** on the named assets with this one.
 *   - `remove_all` — removes the tag from *every* asset in the account that
 *     has it, ignoring the public-id list entirely.
 *
 * `replace` and `remove_all` are the destructive pair, and `remove_all` is the
 * one whose scope has nothing to do with what you passed — so both are gated
 * behind the confirmation flag.
 */
const action: ActionDefinition = {
  key: "asset-tag",
  type: "perform",
  resource: "asset",
  title: "Manage tags",
  description:
    "Add or remove one tag across many assets without touching their other tags. `replace` and " +
    "`remove_all` are destructive and need confirming.",
  idempotent: true,
  params: [
    {
      key: "tag",
      label: "Tag",
      type: "string",
      required: true,
      default: "",
    },
    {
      key: "command",
      label: "Command",
      type: "select",
      required: true,
      default: "add",
      options: [
        { value: "add", label: "Add — to the listed assets" },
        { value: "remove", label: "Remove — from the listed assets" },
        { value: "replace", label: "Replace — makes this the ONLY tag on the listed assets" },
        { value: "remove_all", label: "Remove all — from EVERY asset in the account" },
      ],
    },
    {
      key: "publicIds",
      label: "Public IDs",
      type: "string",
      default: "",
      hint: "Comma-separated, up to 1000. Ignored by `remove_all`, which works account-wide.",
    },
    RESOURCE_TYPE_PARAM,
    {
      key: "confirm",
      label: "Yes, I mean the destructive version",
      type: "boolean",
      default: false,
      hint: "Required for `replace` (which drops every other tag) and `remove_all` (which " +
        "ignores the id list and touches the whole account).",
    },
  ],
  output: [
    { key: "public_ids", type: "array", label: "Affected public IDs" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const tag = String(p.tag ?? "").trim();
    if (!tag) throw new Error("`tag` is required");
    const command = String(p.command ?? "add");
    const publicIds = csv(p.publicIds);

    if (command !== "remove_all" && !publicIds) {
      throw new Error(`\`publicIds\` is required for the \`${command}\` command`);
    }
    if (publicIds && publicIds.length > 1000) {
      throw new Error(`Cloudinary tags at most 1000 assets per call; got ${publicIds.length}`);
    }
    if ((command === "replace" || command === "remove_all") && p.confirm !== true) {
      throw new Error(
        command === "remove_all"
          ? "`remove_all` ignores the public-id list and removes this tag from EVERY asset in " +
            "the account — set `confirm` to mean it"
          : "`replace` removes every OTHER tag from the listed assets — set `confirm` to mean it",
      );
    }

    const resourceType = String(p.resourceType ?? "image");
    ctx.log(
      command === "add" || command === "remove" ? "info" : "warn",
      "tagging Cloudinary assets",
      {
        command,
        tag,
        count: publicIds?.length,
      },
    );

    return await new CloudinaryClient(ctx).request(
      `/${encodeURIComponent(resourceType)}/tags`,
      {
        method: "POST",
        form: true,
        body: { tag, command, ...(publicIds ? { public_ids: publicIds } : {}) },
      },
    );
  },
};

export default action;
