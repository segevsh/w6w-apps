import type { ActionDefinition } from "@w6w/types";
import { FormsiteClient } from "../lib/client.ts";

type Input = Record<string, never>;

const formList: ActionDefinition<Input> = {
  key: "form-list",
  type: "search",
  resource: "form",
  title: "List Forms",
  description: "List every form on the account, with its state and stored result count.",
  params: [],
  output: [{ key: "forms", type: "array", label: "Forms" }],

  async execute(_input, ctx) {
    const res = await new FormsiteClient(ctx).request<{ forms?: unknown[] }>("/forms");
    return { forms: res.forms ?? [] };
  },
};

export default formList;
