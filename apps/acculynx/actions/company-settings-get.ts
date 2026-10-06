import type { ActionDefinition } from "@w6w/types";
import { AccuLynxClient } from "../lib/client.ts";

type Input = Record<string, unknown>;

const action: ActionDefinition<Input> = {
  key: "company-settings-get",
  type: "read",
  resource: "company",
  title: "Get Company Settings",
  description: "Get the company's id, name and time zone.",
  params: [],
  output: [
    { key: "companyId", type: "string", label: "Company id" },
    { key: "name", type: "string", label: "Company name" },
    { key: "timeZoneInfo", type: "object", label: "Time zone" },
    { key: "hasInsurance", type: "boolean", label: "Insurance flag" },
  ],

  async execute(_input, ctx) {
    return await new AccuLynxClient(ctx).get("/company-settings");
  },
};

export default action;
