import type { ActionDefinition } from "@w6w/types";
import { encodeId, one, pick } from "../lib/client.ts";
import { str } from "../lib/params.ts";

/**
 * `POST /murals/{muralId}/tags` (Mural public API v1). OAuth scope: `murals:write`.
 */
type Input = {
  muralId: string;
  text: string;
  backgroundColor?: string;
  borderColor?: string;
  color?: string;
};

const tagCreate: ActionDefinition<Input> = {
  key: "tag-create",
  type: "perform",
  resource: "tag",
  title: "Create Mural Tag",
  description: "Create a tag on a mural. Needs the `murals:write` OAuth scope.",
  idempotent: false,
  params: [
    str("muralId", "Mural ID", {
      required: true,
      hint: 'The mural ID, e.g. "ws12345.1608152669000".',
    }),
    str("text", "Text", { required: true }),
    str("backgroundColor", "Background colour"),
    str("borderColor", "Border colour"),
    str("color", "Text colour"),
  ],
  output: [
    { key: "id", type: "string", label: "Tag ID" },
    { key: "text", type: "string", label: "Text" },
  ],

  execute(input, ctx) {
    return one(ctx, "POST", `/murals/${encodeId(input.muralId)}/tags`, {
      body: pick(input, ["text", "backgroundColor", "borderColor", "color"]),
    });
  },
};

export default tagCreate;
