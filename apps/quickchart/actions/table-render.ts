import type { ActionDefinition } from "@w6w/types";
import { compact, IMAGE_OUTPUT, QuickChartClient } from "../lib/client.ts";
import { jsonValue } from "../lib/params.ts";

interface Input {
  data: unknown;
  options?: unknown;
}

/**
 * `POST /v1/table` — renders a table as a PNG (PNG only; there is no format parameter).
 *
 * `data` is `{title?, columns: [{title, dataIndex, width?, align?}], dataSource: [{...} | "-"]}`.
 * Every column needs BOTH `title` and `dataIndex` (the row key); a `"-"` row draws a separator.
 * `options` tunes the renderer (`cellWidth`, `cellHeight`, `fontFamily`, `backgroundColor`...).
 */
const tableRender: ActionDefinition<Input> = {
  key: "table-render",
  type: "perform",
  resource: "table",
  title: "Render Table",
  description: "Render a table of rows and columns as a PNG image.",
  idempotent: true,
  requiresAuth: false,
  params: [
    {
      key: "data",
      label: "Table (JSON)",
      type: "text",
      required: true,
      hint: '{"columns":[{"title":"Name","dataIndex":"name"}],"dataSource":[{"name":' +
        '"Ada"}]} — use "-" as a dataSource entry for a separator line.',
    },
    {
      key: "options",
      label: "Renderer options (JSON)",
      type: "text",
      hint: 'Optional, e.g. {"cellWidth":120,"backgroundColor":"#ffffff"}.',
    },
  ],
  output: IMAGE_OUTPUT,

  async execute(input, ctx) {
    return await new QuickChartClient(ctx).image(
      "/v1/table",
      compact({
        data: jsonValue("data", input.data),
        options: input.options ? jsonValue("options", input.options) : undefined,
      }),
      "table",
    );
  },
};

export default tableRender;
