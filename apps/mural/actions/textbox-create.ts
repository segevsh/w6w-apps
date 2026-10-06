import type { ActionDefinition } from "@w6w/types";
import { encodeId, first, jsonFields, pick } from "../lib/client.ts";
import { json, num, str } from "../lib/params.ts";

/**
 * `POST /murals/{muralId}/widgets/textbox` (Mural public API v1). OAuth scope: `murals:write`.
 */
type Input = {
  muralId: string;
  text?: string;
  x?: number;
  y?: number;
  style?: unknown;
  width?: number;
  height?: number;
  rotation?: number;
  parentId?: string;
  title?: string;
  instruction?: string;
};

const textboxCreate: ActionDefinition<Input> = {
  key: "textbox-create",
  type: "perform",
  resource: "widget",
  title: "Create Text Box",
  description: "Add a text box to a mural. Needs the `murals:write` OAuth scope.",
  idempotent: false,
  params: [
    str("muralId", "Mural ID", {
      required: true,
      hint: 'The mural ID, e.g. "ws12345.1608152669000".',
    }),
    str("text", "Text"),
    num("x", "X", { hint: "Horizontal position on the canvas." }),
    num("y", "Y", { hint: "Vertical position on the canvas." }),
    json("style", "Style", {
      hint:
        'Vendor style object, e.g. {"backgroundColor":"#FFE08AFF"} (colours are hex with alpha).',
    }),
    num("width", "Width"),
    num("height", "Height"),
    num("rotation", "Rotation"),
    str("parentId", "Parent widget ID", {
      hint: "An area or similar container widget to place this inside.",
    }),
    str("title", "Title"),
    str("instruction", "Instruction"),
  ],
  output: [
    { key: "id", type: "string", label: "Widget ID" },
    { key: "type", type: "string", label: "Widget type" },
    { key: "x", type: "number", label: "X" },
    { key: "y", type: "number", label: "Y" },
    { key: "viewLink", type: "string", label: "Link to the widget" },
  ],

  execute(input, ctx) {
    return first(ctx, "POST", `/murals/${encodeId(input.muralId)}/widgets/textbox`, {
      body: [
        jsonFields(
          pick(input, [
            "text",
            "x",
            "y",
            "style",
            "width",
            "height",
            "rotation",
            "parentId",
            "title",
            "instruction",
          ]),
          ["style"],
        ),
      ],
    });
  },
};

export default textboxCreate;
