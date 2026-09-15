import type { ActionDefinition } from "@w6w/types";
import { FloatClient } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

/** `GET /v3/clients` — list clients. */
interface Input {
  page?: number;
  "per-page"?: number;
}

const clientList: ActionDefinition<Input> = {
  key: "client-list",
  type: "read",
  resource: "client",
  title: "List Clients",
  description: "List clients.",
  params: [...paginationParams()],
  output: [
    { key: "client_id", type: "number", label: "Client ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  async execute(input, ctx) {
    const { items, pagination } = await new FloatClient(ctx).list("/clients", {
      page: input.page,
      "per-page": input["per-page"],
    });
    return { items, pagination };
  },
};

export default clientList;
