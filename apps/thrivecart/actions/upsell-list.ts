import type { ActionDefinition } from "@w6w/types";
import { ThriveCartClient } from "../lib/client.ts";
import { modeParam } from "../lib/params.ts";

interface Upsell {
  upsell_id: string;
  name?: string;
  label?: string;
  type?: string;
  typeString?: string;
}

/** `GET /upsells` — every upsell in the account. */
interface Input {
  mode?: string;
}

const upsellList: ActionDefinition<Input> = {
  key: "upsell-list",
  type: "search",
  resource: "upsell",
  title: "List Upsells",
  description: "List every upsell in the account.",
  params: [modeParam],
  output: [{ key: "items", type: "array", label: "Upsells" }],

  async execute(input, ctx) {
    const items = await new ThriveCartClient(ctx).get<Upsell[]>("/upsells", { mode: input.mode });
    return { items: items ?? [] };
  },
};

export default upsellList;
