import type { ActionDefinition } from "@w6w/types";
import { ThriveCartClient } from "../lib/client.ts";
import { modeParam } from "../lib/params.ts";

interface Bump {
  product_id: string;
  product_name?: string;
  product_label?: string;
  bump_id: string;
  bump_name?: string;
  name?: string;
  id?: string;
  url?: string;
  status?: string;
  statusString?: string;
  type?: string;
  typeString?: string;
  payment_currency?: string;
  payment_amount?: number;
}

/** `GET /bumps` — every order-bump offer in the account. */
interface Input {
  mode?: string;
}

const bumpList: ActionDefinition<Input> = {
  key: "bump-list",
  type: "search",
  resource: "bump",
  title: "List Bump Offers",
  description: "List every order-bump offer in the account.",
  params: [modeParam],
  output: [{ key: "items", type: "array", label: "Bump offers" }],

  async execute(input, ctx) {
    const items = await new ThriveCartClient(ctx).get<Bump[]>("/bumps", { mode: input.mode });
    return { items: items ?? [] };
  },
};

export default bumpList;
