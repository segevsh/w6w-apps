import type { ActionDefinition } from "@w6w/types";
import { FlodeskClient } from "../lib/client.ts";

interface Input {
  name: string;
  color?: string;
}

/**
 * `POST /v1/segments`.
 *
 * `idempotent: false` — Flodesk answers `201` and publishes no uniqueness rule
 * on `name`, so calling this twice is the documented way to end up with two
 * segments of the same name. Marking it idempotent would be a lie that suppresses
 * a retry the host should be cautious about.
 *
 * `color` must be one of the palette values Flodesk accepts, which is why
 * `List Segment Colors` exists as its own endpoint — the field's own description
 * says "Use `GET List all segment colors` to view available colors."
 */
const createSegment: ActionDefinition<Input> = {
  key: "create-segment",
  type: "perform",
  resource: "segment",
  title: "Create Segment",
  description:
    "Create a segment. Flodesk does not enforce unique names, so a repeated call creates a second segment.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "color",
      label: "Color",
      type: "string",
      placeholder: "#B7D4C7",
      hint:
        "Hex code from Flodesk's palette. Run List Segment Colors for the accepted values — arbitrary hex codes are not guaranteed to be accepted.",
    },
  ],
  output: [{ key: "segment", type: "object", label: "The created segment" }],

  execute(input, ctx) {
    const body: Record<string, unknown> = { name: input.name };
    if (input.color !== undefined) body.color = input.color;
    return new FlodeskClient(ctx).request("/segments", { method: "POST", body });
  },
};

export default createSegment;
