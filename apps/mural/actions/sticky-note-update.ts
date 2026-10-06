import type { ActionDefinition } from "@w6w/types";
import { encodeId, jsonFields, one, pick } from "../lib/client.ts";
import { json, num, str } from "../lib/params.ts";

/**
 * `PATCH /murals/{muralId}/widgets/sticky-note/{widgetId}` (Mural public API v1). OAuth scope: `murals:write`.
 */
type Input = {
  muralId: string;
  widgetId: string;
  text?: string;
  htmlText?: string;
  x?: number;
  y?: number;
  style?: unknown;
  tags?: unknown;
  width?: number;
  height?: number;
  rotation?: number;
  parentId?: string;
  title?: string;
  instruction?: string;
};

const stickyNoteUpdate: ActionDefinition<Input> = {
  key: "sticky-note-update",
  type: "perform",
  resource: "widget",
  title: "Update Sticky Note",
  description:
    "Change a sticky note's text, position or style. Needs the `murals:write` OAuth scope.",
  idempotent: true,
  params: [
    str("muralId", "Mural ID", {
      required: true,
      hint: 'The mural ID, e.g. "ws12345.1608152669000".',
    }),
    str("widgetId", "Widget ID", { required: true, hint: "The widget ID, from List Widgets." }),
    str("text", "Text"),
    str("htmlText", "HTML text"),
    num("x", "X", { hint: "Horizontal position on the canvas." }),
    num("y", "Y", { hint: "Vertical position on the canvas." }),
    json("style", "Style", {
      hint:
        'Vendor style object, e.g. {"backgroundColor":"#FFE08AFF"} (colours are hex with alpha).',
    }),
    json("tags", "Tag IDs", { hint: "JSON array of tag IDs." }),
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
    return one(
      ctx,
      "PATCH",
      `/murals/${encodeId(input.muralId)}/widgets/sticky-note/${encodeId(input.widgetId)}`,
      {
        body: jsonFields(
          pick(input, [
            "text",
            "htmlText",
            "x",
            "y",
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
      },
    );
  },
};

export default stickyNoteUpdate;
