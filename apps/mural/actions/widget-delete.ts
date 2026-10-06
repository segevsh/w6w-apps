import type { ActionDefinition } from "@w6w/types";
import { encodeId, none } from "../lib/client.ts";
import { str } from "../lib/params.ts";

/**
 * `DELETE /murals/{muralId}/widgets/{widgetId}` (Mural public API v1). OAuth scope: `murals:write`.
 */
type Input = {
  muralId: string;
  widgetId: string;
};

const widgetDelete: ActionDefinition<Input> = {
  key: "widget-delete",
  type: "perform",
  resource: "widget",
  title: "Delete Widget",
  description: "Delete a widget from a mural. Needs the `murals:write` OAuth scope.",
  idempotent: true,
  params: [
    str("muralId", "Mural ID", {
      required: true,
      hint: 'The mural ID, e.g. "ws12345.1608152669000".',
    }),
    str("widgetId", "Widget ID", { required: true, hint: "The widget ID, from List Widgets." }),
  ],
  output: [
    { key: "deleted", type: "boolean", label: "true when the widget was deleted" },
    { key: "id", type: "string", label: "Deleted ID" },
  ],

  execute(input, ctx) {
    return none(
      ctx,
      "DELETE",
      `/murals/${encodeId(input.muralId)}/widgets/${encodeId(input.widgetId)}`,
      {},
      String(input.widgetId),
    );
  },
};

export default widgetDelete;
