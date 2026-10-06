import type { ActionDefinition } from "@w6w/types";
import { MoonClerkClient } from "../lib/client.ts";
import { countParam, offsetParam } from "../lib/params.ts";

interface Input {
  count?: number;
  offset?: number;
}

/** `GET /forms` — every payment form, wrapped as `{ "forms": [...] }`. */
const formList: ActionDefinition<Input> = {
  key: "form-list",
  type: "search",
  resource: "form",
  title: "List Forms",
  description:
    "List the account's payment forms with their currency, payment volume and successful checkout count.",
  params: [countParam, offsetParam],
  output: [
    { key: "forms", type: "array", label: "Forms" },
    {
      key: "nextOffset",
      type: "number",
      label: "Offset of the next page, when a full page came back",
    },
  ],

  async execute(input, ctx) {
    const { items, nextOffset } = await new MoonClerkClient(ctx).list("/forms", "forms", {
      count: input.count,
      offset: input.offset,
    });
    return { forms: items, ...(nextOffset !== undefined ? { nextOffset } : {}) };
  },
};

export default formList;
