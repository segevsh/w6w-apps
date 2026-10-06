import type { ActionDefinition } from "@w6w/types";
import { encodeId, one, pick } from "../lib/client.ts";
import { num, str } from "../lib/params.ts";

/**
 * `POST /murals/{muralId}/widgets/comment` (Mural public API v1). OAuth scope: `murals:write`.
 */
type Input = {
  muralId: string;
  message: string;
  x: number;
  y: number;
  referenceWidgetId?: string;
};

const commentCreate: ActionDefinition<Input> = {
  key: "comment-create",
  type: "perform",
  resource: "widget",
  title: "Create Comment",
  description:
    "Add a comment pin to a mural, optionally attached to a widget. Needs the `murals:write` OAuth scope.",
  idempotent: false,
  params: [
    str("muralId", "Mural ID", {
      required: true,
      hint: 'The mural ID, e.g. "ws12345.1608152669000".',
    }),
    str("message", "Message", { required: true }),
    num("x", "X", { required: true, hint: "Horizontal position on the canvas." }),
    num("y", "Y", { required: true, hint: "Vertical position on the canvas." }),
    str("referenceWidgetId", "Reference widget ID", { hint: "Attach the comment to this widget." }),
  ],
  output: [
    { key: "id", type: "string", label: "Widget ID" },
    { key: "type", type: "string", label: "Widget type" },
    { key: "x", type: "number", label: "X" },
    { key: "y", type: "number", label: "Y" },
    { key: "viewLink", type: "string", label: "Link to the widget" },
  ],

  execute(input, ctx) {
    return one(ctx, "POST", `/murals/${encodeId(input.muralId)}/widgets/comment`, {
      body: pick(input, ["message", "x", "y", "referenceWidgetId"]),
    });
  },
};

export default commentCreate;
