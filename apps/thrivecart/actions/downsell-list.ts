import type { ActionDefinition } from "@w6w/types";
import { ThriveCartClient } from "../lib/client.ts";
import { modeParam } from "../lib/params.ts";

interface Downsell {
  downsell_id: string;
  name?: string;
  label?: string;
  type?: string;
  typeString?: string;
}

/** `GET /downsells` — every downsell in the account. */
interface Input {
  mode?: string;
}

const downsellList: ActionDefinition<Input> = {
  key: "downsell-list",
  type: "search",
  resource: "downsell",
  title: "List Downsells",
  description: "List every downsell in the account.",
  params: [modeParam],
  output: [{ key: "items", type: "array", label: "Downsells" }],

  async execute(input, ctx) {
    const items = await new ThriveCartClient(ctx).get<Downsell[]>("/downsells", {
      mode: input.mode,
    });
    return { items: items ?? [] };
  },
};

export default downsellList;
