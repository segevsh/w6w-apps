import type { ActionDefinition } from "@w6w/types";
import {
  GraphClient,
  odataString,
  segment,
  sessionHeaders,
  workbookPath,
  type WorkbookRef,
} from "../lib/client.ts";
import { sessionIdParam, workbookParams, worksheetParam } from "../lib/params.ts";

interface Input extends WorkbookRef {
  worksheet: string;
  chart: string;
  width?: number;
  height?: number;
  fittingMode?: string;
  sessionId?: string;
}

interface Output {
  value?: string;
  dataUri?: string;
}

/**
 * `GET …/workbook/worksheets/{id|name}/charts/{name}/image(width=…,height=…,fittingMode='…')`
 *
 * https://learn.microsoft.com/en-us/graph/api/chart-image
 *
 * "Renders the chart as a base64-encoded image by scaling the chart to fit the
 * specified dimensions." The response is `{ "value": "<base-64 string>" }` — a
 * JSON envelope around the image, not image bytes — so this is a `read` that
 * returns a string, and the string is PNG data.
 *
 * The reference documents four path shapes: bare `/image`, `image(width=…)`,
 * `image(width=…,height=…)`, and the full three-parameter form. They nest, so
 * you cannot set `height` without `width`. This action always emits the full
 * form and defaults it to `width=0, height=0, fittingMode='Fit'`, which the
 * reference names as the default behaviour — that sidesteps the nesting rule
 * entirely and keeps one code path.
 *
 * `fittingMode` is `Fit`, `FitAndCenter` or `Fill`, and only applies when both
 * height and width are set to non-zero values.
 *
 * Charts are addressed here by **name** — the label Excel shows in the UI, e.g.
 * `Chart 1` — because that is the identifier the reference's own path uses
 * (`/charts/{name}/image`). Listing a worksheet's charts is not implemented; see
 * the README's "Not implemented" section.
 *
 * `dataUri` is assembled locally for convenience: it is `value` prefixed with
 * the PNG data-URI header, nothing more, and it involves no extra request.
 */
const getChartImage: ActionDefinition<Input, Output> = {
  key: "get-chart-image",
  type: "read",
  resource: "chart",
  title: "Get Chart Image",
  description:
    "Render a worksheet chart to a base64-encoded PNG — for embedding in a report, an email or a Slack message.",
  params: [
    ...workbookParams(),
    worksheetParam(),
    {
      key: "chart",
      label: "Chart name",
      type: "string",
      required: true,
      placeholder: "Chart 1",
      hint:
        "The chart's name as shown in Excel. Ids also work in this position but are brace-wrapped GUIDs, which the name spares you.",
    },
    {
      key: "width",
      label: "Width (px)",
      type: "number",
      default: 0,
      validation: { integer: true, min: 0 },
      hint: "0 keeps the chart's own width. Documented as the default behaviour.",
    },
    {
      key: "height",
      label: "Height (px)",
      type: "number",
      default: 0,
      validation: { integer: true, min: 0 },
      hint: "0 keeps the chart's own height.",
    },
    {
      key: "fittingMode",
      label: "Fitting mode",
      type: "select",
      default: "Fit",
      options: [
        { value: "Fit", label: "Fit — scale to fit inside the box" },
        { value: "FitAndCenter", label: "Fit and centre" },
        { value: "Fill", label: "Fill — cover the box" },
      ],
      hint: "Only takes effect when both width and height are non-zero.",
    },
    sessionIdParam,
  ],
  output: [
    { key: "value", type: "string", label: "Base64 PNG" },
    { key: "dataUri", type: "string", label: "PNG data URI" },
  ],

  async execute(input, ctx): Promise<Output> {
    const client = new GraphClient(ctx);
    const width = input.width ?? 0;
    const height = input.height ?? 0;
    const fittingMode = odataString(input.fittingMode ?? "Fit");
    const image = `/image(width=${width},height=${height},fittingMode='${fittingMode}')`;

    const path = `${workbookPath(input)}/worksheets/${segment(input.worksheet)}` +
      `/charts/${segment(input.chart)}${image}`;

    const body = await client.request<{ value?: string }>(path, {
      headers: sessionHeaders(input.sessionId),
    });

    const value = body?.value;
    return {
      value,
      dataUri: value ? `data:image/png;base64,${value}` : undefined,
    };
  },
};

export default getChartImage;
