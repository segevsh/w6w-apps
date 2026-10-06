import type { ActionDefinition } from "@w6w/types";
import { call, requireStr } from "../lib/client.ts";
import { str } from "../lib/params.ts";

type Input = Record<string, unknown>;

const whatsappBalanceGet: ActionDefinition<Input> = {
  key: "whatsapp-balance-get",
  type: "read",
  resource: "whatsapp",
  title: "Get WhatsApp Prepaid Balance",
  description: "Read the prepaid balance and plan status for an integrated WhatsApp number.",
  params: [
    str("integratedNumber", "Integrated number", { required: true, hint: "With country code." }),
  ],
  output: [
    { key: "prepaidBalance", type: "number", label: "Prepaid balance" },
    { key: "planStatus", type: "string", label: "Plan status" },
    { key: "number", type: "string", label: "Number" },
  ],

  async execute(input, ctx) {
    const res = await call(ctx, "POST", "/subscriptions/fetchPrepaidBalance", {
      body: {
        integrated_number: requireStr("integratedNumber", input.integratedNumber),
        service: "whatsapp",
      },
    });
    const d = (res.data && typeof res.data === "object" ? res.data : res) as Record<
      string,
      unknown
    >;
    return {
      prepaidBalance: d.prepaid_balance ?? null,
      planStatus: d.plan_status ?? null,
      number: d.number ?? null,
    };
  },
};

export default whatsappBalanceGet;
