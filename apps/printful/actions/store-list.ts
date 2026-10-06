import type { ActionDefinition } from "@w6w/types";
import { PrintfulClient } from "../lib/client.ts";

type Input = Record<string, never>;

/** `GET /stores` — List the stores the token can see (all stores for an account-level token, one for a store-level token). */
const storeList: ActionDefinition<Input> = {
  key: "store-list",
  type: "search",
  resource: "store",
  title: "List Stores",
  description:
    "List the stores the token can see (all stores for an account-level token, one for a store-level token).",
  params: [],
  output: [
    { key: "stores", type: "array", label: "Stores (id, name, type)" },
    { key: "paging", type: "object", label: "Paging (total, offset, limit)" },
  ],

  async execute(_input, ctx) {
    const { items, paging } = await new PrintfulClient(ctx).list("/stores");
    return { stores: items, ...(paging ? { paging } : {}) };
  },
};

export default storeList;
