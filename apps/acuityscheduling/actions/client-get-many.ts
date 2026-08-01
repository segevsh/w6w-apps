import type { ActionDefinition } from "@w6w/types";
import { AcuityClient } from "../lib/client.ts";

interface Input {
  search?: string;
}

/**
 * GET /clients — the account's clients, optionally filtered by name or
 * phone number.
 */
const clientGetMany: ActionDefinition<Input, unknown[]> = {
  key: "client-get-many",
  type: "read",
  resource: "client",
  title: "List Clients",
  description: "List clients, optionally filtered by name or phone (GET /clients).",
  params: [
    {
      key: "search",
      label: "Search",
      type: "string",
      hint: "Filters by first name, last name, or phone number.",
    },
  ],
  output: [{ key: "", type: "array", label: "Clients" }],

  execute(input, ctx) {
    return new AcuityClient(ctx).request<unknown[]>("/clients", {
      query: { search: input.search },
    });
  },
};

export default clientGetMany;
