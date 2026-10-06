import type { ActionDefinition } from "@w6w/types";
import { encodeSegment, PrintNodeClient } from "../lib/client.ts";

/**
 * `GET /computer/{id}/scales` or `GET /computer/{id}/scales/{deviceName}`.
 *
 * Note `computer` is SINGULAR here (the rest of the API is `/computers`). The
 * answer is the most recent reading per scale, retained only 45 seconds; an
 * empty array means no scale reported recently — and, for any positive id,
 * the vendor answers 200 even when the computer is not yours.
 */
interface Input {
  computerId: number;
  deviceName?: string;
}

const scaleList: ActionDefinition<Input> = {
  key: "scale-list",
  type: "read",
  resource: "scale",
  title: "List Scale Readings",
  description: "Read the most recent weight readings from scales attached to a computer.",
  params: [
    {
      key: "computerId",
      label: "Computer ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 0 },
      hint: "Computer `0` is PrintNode's virtual test computer.",
    },
    {
      key: "deviceName",
      label: "Device name",
      type: "string",
      hint: "Optional filter, e.g. `PrintNode Test Scale`.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Scale readings" },
    { key: "count", type: "number", label: "Returned" },
  ],
  async execute(input, ctx) {
    const id = Number(input.computerId);
    if (!Number.isInteger(id) || id < 0) throw new Error("Computer ID must be a whole number");
    const name = input.deviceName?.trim();
    const path = name ? `/computer/${id}/scales/${encodeSegment(name)}` : `/computer/${id}/scales`;
    const items = await new PrintNodeClient(ctx).json<unknown[]>(path);
    return { items, count: Array.isArray(items) ? items.length : 0 };
  },
};

export default scaleList;
