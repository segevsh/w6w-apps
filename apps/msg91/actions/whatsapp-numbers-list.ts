import type { ActionDefinition } from "@w6w/types";
import { call } from "../lib/client.ts";

type Input = Record<string, unknown>;

const whatsappNumbersList: ActionDefinition<Input> = {
  key: "whatsapp-numbers-list",
  type: "read",
  resource: "whatsapp",
  title: "List WhatsApp Numbers",
  description: "List the WhatsApp numbers integrated with your MSG91 account.",
  params: [],
  output: [{ key: "numbers", type: "object", label: "MSG91's response" }],

  async execute(_input, ctx) {
    const res = await call(ctx, "GET", "/whatsapp/whatsapp-activation/");
    return { numbers: res.data ?? res };
  },
};

export default whatsappNumbersList;
