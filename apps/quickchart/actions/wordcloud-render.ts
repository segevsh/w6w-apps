import type { ActionDefinition } from "@w6w/types";
import { compact, IMAGE_OUTPUT, QuickChartClient } from "../lib/client.ts";

interface Input {
  text: string;
  format?: string;
  width?: number;
  height?: number;
  backgroundColor?: string;
  fontFamily?: string;
  fontScale?: number;
  scale?: string;
  maxNumWords?: number;
  case?: string;
  colors?: string;
  removeStopwords?: boolean;
  useWordList?: boolean;
}

/**
 * `POST /wordcloud` — renders a word cloud. Defaults to **SVG**, unlike the chart and QR routes
 * which default to PNG. With `useWordList` the text is a comma-separated `word:count` list
 * (`understanding:5,freedom:10`) instead of prose.
 */
const wordcloudRender: ActionDefinition<Input> = {
  key: "wordcloud-render",
  type: "perform",
  resource: "wordcloud",
  title: "Render Word Cloud",
  description: "Render a word cloud from text or a word:count list.",
  idempotent: true,
  requiresAuth: false,
  params: [
    { key: "text", label: "Text", type: "text", required: true },
    {
      key: "useWordList",
      label: "Text is a word:count list",
      type: "boolean",
      hint: "Treat the text as comma-separated word:count entries, e.g. hello:5,world:2.",
    },
    {
      key: "format",
      label: "Format",
      type: "select",
      default: "svg",
      options: [{ value: "svg", label: "SVG" }, { value: "png", label: "PNG" }],
    },
    { key: "width", label: "Width (px)", type: "number", validation: { min: 1, max: 3000 } },
    { key: "height", label: "Height (px)", type: "number", validation: { min: 1, max: 3000 } },
    { key: "backgroundColor", label: "Background colour", type: "string" },
    { key: "fontFamily", label: "Font family", type: "string" },
    { key: "fontScale", label: "Largest word size", type: "number" },
    {
      key: "scale",
      label: "Frequency scale",
      type: "select",
      options: [
        { value: "linear", label: "Linear" },
        { value: "sqrt", label: "Square root" },
        { value: "log", label: "Logarithmic" },
      ],
    },
    {
      key: "maxNumWords",
      label: "Max words",
      type: "number",
      validation: { min: 1, max: 200, integer: true },
    },
    {
      key: "case",
      label: "Case",
      type: "select",
      options: [
        { value: "lower", label: "Lower" },
        { value: "upper", label: "Upper" },
        { value: "none", label: "Unchanged" },
      ],
    },
    {
      key: "colors",
      label: "Colours",
      type: "string",
      hint: "Comma-separated colours assigned to words at random.",
    },
    { key: "removeStopwords", label: "Remove stopwords", type: "boolean" },
  ],
  output: IMAGE_OUTPUT,

  async execute(input, ctx) {
    const { colors, ...rest } = input;
    const list = (colors ?? "").split(",").map((c) => c.trim()).filter(Boolean);
    return await new QuickChartClient(ctx).image(
      "/wordcloud",
      compact({ ...rest, format: input.format ?? "svg", colors: list.length ? list : undefined }),
      "wordcloud",
    );
  },
};

export default wordcloudRender;
