import type { ActionDefinition } from "@w6w/types";
import { CallRailClient, encodeId } from "../lib/client.ts";
import { accountIdParam, tagColorOptions } from "../lib/params.ts";

/** `PUT /v3/a/{account_id}/tags/{tag_id}.json` — Updating a Tag. */
interface Input {
  accountId: string;
  tagId: string;
  name?: string;
  color?: string;
  disabled?: boolean;
}

const tagUpdate: ActionDefinition<Input> = {
  key: "tag-update",
  type: "perform",
  resource: "tag",
  title: "Update Tag",
  description: "Rename or recolor a tag, or disable it from being applied to new interactions.",
  idempotent: true,
  params: [
    accountIdParam,
    {
      key: "tagId",
      label: "Tag ID",
      type: "string",
      required: true,
      hint: "From the `id` of a List Tags or Create Tag result.",
    },
    {
      key: "name",
      label: "Name",
      type: "string",
      hint: "Renaming changes the tag everywhere it's currently applied.",
    },
    { key: "color", label: "Color", type: "select", options: tagColorOptions },
    {
      key: "disabled",
      label: "Disabled",
      type: "boolean",
      hint: "On: the tag can no longer be applied to new interactions. It stays on anything " +
        "already tagged with it — this does not remove it retroactively.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Tag ID" },
    { key: "name", type: "string", label: "Tag name" },
    { key: "status", type: "string", label: "enabled or disabled" },
  ],

  execute(input, ctx) {
    return new CallRailClient(ctx).json(
      `/a/${encodeId(input.accountId)}/tags/${encodeId(input.tagId)}.json`,
      { method: "PUT", body: { name: input.name, color: input.color, disabled: input.disabled } },
    );
  },
};

export default tagUpdate;
