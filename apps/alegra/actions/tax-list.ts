import type { ActionDefinition } from "@w6w/types";
import { AlegraClient } from "../lib/client.ts";

interface Input {
  start?: number;
  limit?: number;
  fields?: string;
}

const taxList: ActionDefinition<Input> = {
  key: "tax-list",
  type: "search",
  resource: "tax",
  title: "List Taxes",
  description: "List the account's taxes, to find the tax ids invoice and item lines refer to.",
  params: [
    { key: "start", label: "Start", type: "number", validation: { min: 0, integer: true } },
    { key: "limit", label: "Limit", type: "number", validation: { min: 1, integer: true } },
    {
      key: "fields",
      label: "Extra fields",
      type: "string",
      hint: "Comma-separated additional fields to include.",
    },
  ],
  output: [{ key: "items", type: "array", label: "Taxes" }],

  async execute(input, ctx) {
    const client = new AlegraClient(ctx);
    const taxes = await client.request<unknown[]>("/taxes", {
      query: { start: input.start, limit: input.limit, fields: input.fields },
    });
    if (!Array.isArray(taxes)) throw new Error("Alegra /taxes did not return an array");
    return { items: taxes };
  },
};

export default taxList;
