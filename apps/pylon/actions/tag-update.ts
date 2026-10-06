import type { ActionDefinition } from "@w6w/types";
import { compact, PylonClient, seg } from "../lib/client.ts";
import { idParam, TAG_OUTPUT } from "../lib/params.ts";

interface Input {
  id: string;
  value?: string;
  hexColor?: string;
}

/** `PATCH /tags/{id}` — only `value` and `hex_color` can change. */
const tagUpdate: ActionDefinition<Input> = {
  key: "tag-update",
  type: "perform",
  resource: "tag",
  title: "Update Tag",
  description: "Rename a tag or change its color.",
  idempotent: true,
  params: [
    idParam("Tag ID"),
    { key: "value", label: "Value", type: "string" },
    { key: "hexColor", label: "Hex color", type: "string", placeholder: "#3b82f6" },
  ],
  output: TAG_OUTPUT,

  execute(input, ctx) {
    return new PylonClient(ctx).one("PATCH", `/tags/${seg(input.id)}`, {
      body: compact({ value: input.value, hex_color: input.hexColor }),
    });
  },
};

export default tagUpdate;
