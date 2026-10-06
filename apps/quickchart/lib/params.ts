import type { Param } from "@w6w/types";
import { compact } from "./client.ts";

/**
 * A Chart.js config, QuickChart's `chart` field. It takes either a JSON object or a JavaScript
 * object literal *as a string* — the string form is the only way to include functions (label
 * formatters, plugins). A string that parses as JSON is sent as an object; anything else is sent
 * verbatim so the JavaScript form survives.
 */
export function chartConfig(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
}

/** Parses a JSON text param (or passes through an object); throws a readable error otherwise. */
export function jsonValue(name: string, value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${name} must be valid JSON`);
  }
}

export interface ChartInput {
  chart: unknown;
  width?: number;
  height?: number;
  devicePixelRatio?: number;
  backgroundColor?: string;
  version?: string;
  format?: string;
}

export const CHART_PARAMS: Param[] = [
  {
    key: "chart",
    label: "Chart.js config",
    type: "text",
    required: true,
    hint: 'A Chart.js configuration as JSON, e.g. {"type":"bar","data":{...}}. To use ' +
      "JavaScript functions (label formatters, plugins) write a JavaScript object literal instead.",
  },
  {
    key: "version",
    label: "Chart.js version",
    type: "select",
    default: "2",
    hint: "The config must match this version — v3/v4 options silently do nothing on v2, " +
      "which is the default.",
    options: [
      { value: "2", label: "2 (default)" },
      { value: "3", label: "3" },
      { value: "4", label: "4" },
    ],
  },
  {
    key: "width",
    label: "Width (px)",
    type: "number",
    default: 500,
    validation: { min: 1, max: 3000, integer: true },
  },
  {
    key: "height",
    label: "Height (px)",
    type: "number",
    default: 300,
    validation: { min: 1, max: 3000, integer: true },
  },
  {
    key: "devicePixelRatio",
    label: "Device pixel ratio",
    type: "number",
    hint: "Defaults to 2, which makes the image twice width x height. Set 1 for exactly width x " +
      "height.",
    validation: { min: 0.1, max: 2 },
  },
  {
    key: "backgroundColor",
    label: "Background colour",
    type: "string",
    hint: "A colour name, rgb(), hsl() or hex. Transparent when empty.",
  },
];

export function chartBody(input: ChartInput): Record<string, unknown> {
  return compact({
    chart: chartConfig(input.chart),
    version: input.version,
    width: input.width,
    height: input.height,
    devicePixelRatio: input.devicePixelRatio,
    backgroundColor: input.backgroundColor,
    format: input.format,
  });
}

export interface QrInput {
  text: string;
  format?: string;
  size?: number;
  margin?: number;
  ecLevel?: string;
  dark?: string;
  light?: string;
  finderColor?: string;
  dotStyle?: string;
  finderStyle?: string;
  finderDotStyle?: string;
  centerImageUrl?: string;
  centerImageSizeRatio?: number;
  caption?: string;
}

export const QR_PARAMS: Param[] = [
  { key: "text", label: "Text", type: "text", required: true, hint: "A URL or any text." },
  {
    key: "size",
    label: "Size (px)",
    type: "number",
    default: 150,
    validation: { min: 1, max: 3000, integer: true },
  },
  {
    key: "margin",
    label: "Margin (modules)",
    type: "number",
    validation: { min: 0, integer: true },
  },
  {
    key: "ecLevel",
    label: "Error correction",
    type: "select",
    hint: "Defaults to M, or H when a centre image is set.",
    options: [
      { value: "L", label: "L (7%)" },
      { value: "M", label: "M (15%)" },
      { value: "Q", label: "Q (25%)" },
      { value: "H", label: "H (30%)" },
    ],
  },
  {
    key: "dark",
    label: "Dark colour",
    type: "string",
    placeholder: "000000",
    hint: "Hex only — colour names are not accepted.",
  },
  {
    key: "light",
    label: "Light colour",
    type: "string",
    placeholder: "ffffff",
    hint: "Hex only. Use 0000 for a transparent background.",
  },
  {
    key: "styling",
    label: "Styling",
    title: "Styling",
    type: "section",
    section: "collapsible",
    children: [
      { key: "finderColor", label: "Finder colour", type: "string" },
      {
        key: "dotStyle",
        label: "Dot style",
        type: "select",
        options: [
          { value: "square", label: "Square" },
          { value: "dot", label: "Dot" },
          { value: "rounded", label: "Rounded" },
        ],
      },
      {
        key: "finderStyle",
        label: "Finder style",
        type: "select",
        options: [
          { value: "square", label: "Square" },
          { value: "rounded", label: "Rounded" },
          { value: "circle", label: "Circle" },
        ],
      },
      {
        key: "finderDotStyle",
        label: "Finder dot style",
        type: "select",
        options: [
          { value: "square", label: "Square" },
          { value: "rounded", label: "Rounded" },
          { value: "dot", label: "Dot" },
        ],
      },
      {
        key: "centerImageUrl",
        label: "Centre image URL",
        type: "string",
        hint: "A public PNG or JPEG. Not supported with SVG output. Forces error correction H.",
      },
      {
        key: "centerImageSizeRatio",
        label: "Centre image size ratio",
        type: "number",
        validation: { min: 0, max: 1 },
      },
      { key: "caption", label: "Caption", type: "string", hint: "Text under the code." },
    ],
  },
];

export function qrBody(input: QrInput): Record<string, unknown> {
  return compact({
    text: input.text,
    format: input.format,
    size: input.size,
    margin: input.margin,
    ecLevel: input.ecLevel,
    dark: input.dark,
    light: input.light,
    finderColor: input.finderColor,
    dotStyle: input.dotStyle,
    finderStyle: input.finderStyle,
    finderDotStyle: input.finderDotStyle,
    centerImageUrl: input.centerImageUrl,
    centerImageSizeRatio: input.centerImageSizeRatio,
    caption: input.caption,
  });
}
