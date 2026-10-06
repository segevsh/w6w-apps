import type { ActionDefinition } from "@w6w/types";
import { encodeId, one } from "../lib/client.ts";
import { str } from "../lib/params.ts";

/**
 * `GET /murals/{muralId}/widgets/{widgetId}` (Mural public API v1). OAuth scope: `murals:read`.
 */
type Input = {
  muralId: string;
  widgetId: string;
};

const widgetGet: ActionDefinition<Input> = {
  key: "widget-get",
  type: "read",
  resource: "widget",
  title: "Get Widget",
  description: "Fetch one widget. Needs the `murals:read` OAuth scope.",
  params: [
    str("muralId", "Mural ID", {
      required: true,
      hint: 'The mural ID, e.g. "ws12345.1608152669000".',
    }),
    str("widgetId", "Widget ID", { required: true, hint: "The widget ID, from List Widgets." }),
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
      "GET",
      `/murals/${encodeId(input.muralId)}/widgets/${encodeId(input.widgetId)}`,
    );
  },
};

export default widgetGet;
