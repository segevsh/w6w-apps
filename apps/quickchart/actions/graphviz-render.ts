import type { ActionDefinition } from "@w6w/types";
import { compact, IMAGE_OUTPUT, QuickChartClient } from "../lib/client.ts";

interface Input {
  graph: string;
  format?: string;
  engine?: string;
  width?: number;
  height?: number;
}

/** `POST /graphviz` — renders a DOT graph. Defaults to SVG; `width`/`height` only resize PNG. */
const graphvizRender: ActionDefinition<Input> = {
  key: "graphviz-render",
  type: "perform",
  resource: "graphviz",
  title: "Render Graphviz Diagram",
  description: "Render a Graphviz DOT graph to SVG or PNG.",
  idempotent: true,
  requiresAuth: false,
  params: [
    {
      key: "graph",
      label: "DOT graph",
      type: "text",
      required: true,
      hint: "e.g. digraph G { A -> B }",
    },
    {
      key: "format",
      label: "Format",
      type: "select",
      default: "svg",
      options: [{ value: "svg", label: "SVG" }, { value: "png", label: "PNG" }],
    },
    {
      key: "engine",
      label: "Layout engine",
      type: "select",
      default: "dot",
      options: ["dot", "neato", "fdp", "sfdp", "twopi", "circo"].map((e) => ({
        value: e,
        label: e,
      })),
    },
    {
      key: "width",
      label: "Width (PNG only)",
      type: "number",
      hint: "Set both width and height to resize. Capped at 3000.",
      validation: { min: 1, integer: true },
    },
    {
      key: "height",
      label: "Height (PNG only)",
      type: "number",
      validation: { min: 1, integer: true },
    },
  ],
  output: IMAGE_OUTPUT,

  async execute(input, ctx) {
    return await new QuickChartClient(ctx).image(
      "/graphviz",
      compact({ ...input, format: input.format ?? "svg" }),
      "graph",
    );
  },
};

export default graphvizRender;
