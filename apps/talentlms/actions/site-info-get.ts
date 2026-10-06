import type { ActionDefinition } from "@w6w/types";
import { TalentLmsClient } from "../lib/client.ts";

const siteInfoGet: ActionDefinition<Record<string, never>> = {
  key: "site-info-get",
  type: "read",
  resource: "domain",
  title: "Get Domain Details",
  description: "Totals, signup method, date format and plan limits for the domain.",
  params: [],

  execute(_input, ctx) {
    return new TalentLmsClient(ctx).get("siteinfo");
  },
};

export default siteInfoGet;
