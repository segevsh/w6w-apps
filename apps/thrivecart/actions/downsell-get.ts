import type { ActionDefinition } from "@w6w/types";
import { downsellIdParam, modeParam } from "../lib/params.ts";
import { encodeId, ThriveCartClient } from "../lib/client.ts";

/** `GET /downsells/:downsell_id` — one downsell's definition. */
interface Input {
  downsellId: string;
  mode?: string;
}

const downsellGet: ActionDefinition<Input> = {
  key: "downsell-get",
  type: "read",
  resource: "downsell",
  title: "Get Downsell",
  description: "Fetch one downsell by ID.",
  params: [downsellIdParam, modeParam],
  output: [
    { key: "downsell_id", type: "string", label: "Downsell ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "label", type: "string", label: "Internal label" },
  ],

  execute(input, ctx) {
    return new ThriveCartClient(ctx).get(`/downsells/${encodeId(input.downsellId)}`, {
      mode: input.mode,
    });
  },
};

export default downsellGet;
