import type { ActionDefinition } from "@w6w/types";
import { PrintfulClient, seg } from "../lib/client.ts";

interface Input {
  storeId: string;
}

/** `GET /stores/{storeId}` — Get basic information about one store. */
const storeGet: ActionDefinition<Input> = {
  key: "store-get",
  type: "read",
  resource: "store",
  title: "Get Store",
  description: "Get basic information about one store.",
  params: [
    {
      key: "storeId",
      label: "Store ID",
      type: "string",
      required: true,
      hint: "The numeric store id from List Stores.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Store ID" },
    { key: "name", type: "string", label: "Store name" },
    { key: "type", type: "string", label: "Store type" },
  ],

  async execute(input, ctx) {
    const result = await new PrintfulClient(ctx).request<Record<string, unknown>>(
      "GET",
      `/stores/${seg(input.storeId)}`,
    );
    return result ?? {};
  },
};

export default storeGet;
