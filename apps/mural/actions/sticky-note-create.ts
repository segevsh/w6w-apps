import type { ActionDefinition } from "@w6w/types";
import { encodeId, first, jsonFields, pick } from "../lib/client.ts";
import { json, num, select, str } from "../lib/params.ts";

/**
 * `POST /murals/{muralId}/widgets/sticky-note` (Mural public API v1). OAuth scope: `murals:write`.
 */
type Input = {
  muralId: string;
  x: number;
  y: number;
  shape: string;
  text?: string;
  htmlText?: string;
  style?: unknown;
  tags?: unknown;
  width?: number;
  height?: number;
  rotation?: number;
  parentId?: string;
  title?: string;
  instruction?: string;
};

const stickyNoteCreate: ActionDefinition<Input> = {
  key: "sticky-note-create",
  type: "perform",
  resource: "widget",
  title: "Create Sticky Note",
  description: "Add a sticky note to a mural. Needs the `murals:write` OAuth scope.",
  idempotent: false,
  params: [
    str("muralId", "Mural ID", {
      required: true,
      hint: 'The mural ID, e.g. "ws12345.1608152669000".',
    }),
    num("x", "X", { required: true, hint: "Horizontal position on the canvas." }),
    num("y", "Y", { required: true, hint: "Vertical position on the canvas." }),
    select("shape", "Shape", ["rectangle", "circle"], { required: true }),
    str("text", "Text"),
    str("htmlText", "HTML text"),
    json("style", "Style", {
      hint:
        'Vendor style object, e.g. {"backgroundColor":"#FFE08AFF"} (colours are hex with alpha).',
    }),
    json("tags", "Tag IDs", { hint: "JSON array of existing tag IDs." }),
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
    return first(ctx, "POST", `/murals/${encodeId(input.muralId)}/widgets/sticky-note`, {
      body: [
        jsonFields(
          pick(input, [
            "x",
            "y",
            "shape",
            "text",
            "htmlText",
            "style",
            "tags",
            "width",
            "height",
            "rotation",
            "parentId",
            "title",
            "instruction",
          ]),
          ["style", "tags"],
        ),
      ],
    });
  },
};

export default stickyNoteCreate;
