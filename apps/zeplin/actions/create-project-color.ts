import type { ActionDefinition } from "@w6w/types";
import { type Input, projectIdParam, projectPath } from "../lib/actions.ts";
import { compact, requireText, ZeplinClient } from "../lib/client.ts";

function channel(v: unknown, label: string, max: number, integer: boolean): number {
  const n = Number(v);
  if (v === undefined || v === null || v === "" || !Number.isFinite(n)) {
    throw new Error(`${label} is required`);
  }
  if (n < 0 || n > max || (integer && !Number.isInteger(n))) {
    throw new Error(`${label} must be ${integer ? "an integer " : ""}between 0 and ${max}`);
  }
  return n;
}

const createProjectColor: ActionDefinition<Input> = {
  key: "create-project-color",
  type: "perform",
  resource: "color",
  title: "Create Project Color",
  description:
    "Create a color in the project's local styleguide (POST /v1/projects/{project_id}/colors).",
  idempotent: false,
  params: [
    projectIdParam,
    { key: "name", label: "Name", type: "string", required: true, validation: { maxLength: 100 } },
    {
      key: "r",
      label: "Red",
      type: "number",
      required: true,
      validation: { integer: true, min: 0, max: 255 },
    },
    {
      key: "g",
      label: "Green",
      type: "number",
      required: true,
      validation: { integer: true, min: 0, max: 255 },
    },
    {
      key: "b",
      label: "Blue",
      type: "number",
      required: true,
      validation: { integer: true, min: 0, max: 255 },
    },
    {
      key: "a",
      label: "Alpha",
      type: "number",
      required: true,
      default: 1,
      validation: { min: 0, max: 1 },
    },
    {
      key: "sourceId",
      label: "Source ID",
      type: "string",
      hint: "The color's identifier in the design tool.",
    },
  ],
  output: [{ key: "id", type: "string", label: "Color ID" }],

  async execute(input, ctx) {
    const name = requireText(input.name, "Name");
    if (name.length > 100) throw new Error("Name must be at most 100 characters");
    const body = compact({
      name,
      source_id: input.sourceId,
      r: channel(input.r, "Red", 255, true),
      g: channel(input.g, "Green", 255, true),
      b: channel(input.b, "Blue", 255, true),
      a: channel(input.a ?? 1, "Alpha", 1, false),
    });
    return await new ZeplinClient(ctx).request("POST", `${projectPath(input)}/colors`, { body });
  },
};

export default createProjectColor;
