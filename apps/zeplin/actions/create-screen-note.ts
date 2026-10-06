import type { ActionDefinition } from "@w6w/types";
import { type Input, projectIdParam, screenIdParam, screenPath } from "../lib/actions.ts";
import { requireText, ZeplinClient } from "../lib/client.ts";

export const NOTE_COLORS = [
  "yellow",
  "orange",
  "peach",
  "green",
  "turquoise",
  "cornflower_blue",
  "deep_purple",
];

export function coord(value: unknown, label: string): number {
  const n = Number(value);
  if (value === undefined || value === null || value === "" || !Number.isFinite(n)) {
    throw new Error(`${label} is required`);
  }
  if (n < 0 || n > 1) throw new Error(`${label} must be between 0 and 1`);
  return n;
}

export const colorParam = {
  key: "color",
  label: "Color",
  type: "select",
  options: NOTE_COLORS.map((c) => ({ value: c, label: c.replaceAll("_", " ") })),
} as const;

const createScreenNote: ActionDefinition<Input> = {
  key: "create-screen-note",
  type: "perform",
  resource: "note",
  title: "Create Screen Note",
  description:
    "Add a note (a pinned comment thread) to a screen (POST /v1/projects/{project_id}/screens/{screen_id}/notes). Position is normalised to [0, 1] from the screen's top-left corner. Set the start point to make an area note.",
  idempotent: false,
  params: [
    projectIdParam,
    screenIdParam,
    { key: "content", label: "Comment", type: "text", required: true },
    { ...colorParam, required: true, default: "yellow" },
    {
      key: "x",
      label: "X",
      type: "number",
      required: true,
      validation: { min: 0, max: 1 },
      hint: "0-1. For an area note, the end point's X.",
    },
    {
      key: "y",
      label: "Y",
      type: "number",
      required: true,
      validation: { min: 0, max: 1 },
      hint: "0-1. For an area note, the end point's Y.",
    },
    {
      key: "xStart",
      label: "Area start X",
      type: "number",
      validation: { min: 0, max: 1 },
      hint: "Set both start values for an area note.",
    },
    { key: "yStart", label: "Area start Y", type: "number", validation: { min: 0, max: 1 } },
  ],
  output: [{ key: "id", type: "string", label: "Note ID" }],

  async execute(input, ctx) {
    const color = String(input.color ?? "yellow").trim();
    if (!NOTE_COLORS.includes(color)) {
      throw new Error(`Color must be one of ${NOTE_COLORS.join(", ")}`);
    }
    const position: Record<string, number> = {
      x: coord(input.x, "X"),
      y: coord(input.y, "Y"),
    };
    const hasXs = input.xStart !== undefined && input.xStart !== null && input.xStart !== "";
    const hasYs = input.yStart !== undefined && input.yStart !== null && input.yStart !== "";
    if (hasXs !== hasYs) throw new Error("Set both area start X and area start Y, or neither");
    if (hasXs) {
      position.x_start = coord(input.xStart, "Area start X");
      position.y_start = coord(input.yStart, "Area start Y");
    }
    return await new ZeplinClient(ctx).request("POST", `${screenPath(input)}/notes`, {
      body: { content: requireText(input.content, "Comment"), position, color },
    });
  },
};

export default createScreenNote;
