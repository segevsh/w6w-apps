import type { ActionDefinition } from "@w6w/types";
import { encodeSegment, PrintNodeClient } from "../lib/client.ts";

/**
 * `GET /computer/{id}/scale/{deviceName}/{deviceNumber}` — one specific scale.
 *
 * Note `scale` is SINGULAR in this path. Answers `404 ResourceNotFound` when no
 * such scale produced a reading in the last 45 seconds. `mass[0]` is in
 * micrograms (null when the scale reports a negative weight over USB).
 */
interface Input {
  computerId: number;
  deviceName: string;
  deviceNumber?: number;
}

const scaleGet: ActionDefinition<Input> = {
  key: "scale-get",
  type: "read",
  resource: "scale",
  title: "Get Scale Reading",
  description: "Read the latest weight from one scale, identified by device name and number.",
  params: [
    {
      key: "computerId",
      label: "Computer ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 0 },
    },
    {
      key: "deviceName",
      label: "Device name",
      type: "string",
      required: true,
      hint: "As reported by List Scale Readings (`deviceName`).",
    },
    {
      key: "deviceNumber",
      label: "Device number",
      type: "number",
      default: 0,
      validation: { integer: true, min: 0 },
      hint: "Distinguishes identical scales on one computer. Starts at 0.",
    },
  ],
  output: [
    { key: "mass", type: "array", label: "[micrograms, resolution micrograms]" },
    { key: "measurement", type: "object", label: "Reading in the scale's display units" },
    { key: "deviceName", type: "string", label: "Device name" },
    { key: "ageOfData", type: "number", label: "Age in ms" },
  ],
  execute(input, ctx) {
    const id = Number(input.computerId);
    const num = Number(input.deviceNumber ?? 0);
    if (!Number.isInteger(id) || id < 0) throw new Error("Computer ID must be a whole number");
    if (!Number.isInteger(num) || num < 0) throw new Error("Device number must be a whole number");
    const name = String(input.deviceName ?? "").trim();
    if (!name) throw new Error("Device name is required");
    return new PrintNodeClient(ctx).json(`/computer/${id}/scale/${encodeSegment(name)}/${num}`);
  },
};

export default scaleGet;
