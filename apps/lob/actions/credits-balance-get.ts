import type { ActionDefinition } from "@w6w/types";
import { LobClient } from "../lib/client.ts";

type Input = Record<string, never>;

const creditsBalanceGet: ActionDefinition<Input> = {
  key: "credits-balance-get",
  type: "read",
  resource: "account",
  title: "Get Lob Credits Balance",
  description: "Return the account's current balance of Lob Credits.",
  params: [],
  output: [{ key: "balance", type: "number", label: "Lob Credits balance" }],

  execute(_input, ctx) {
    return new LobClient(ctx).json("/accounts");
  },
};

export default creditsBalanceGet;
