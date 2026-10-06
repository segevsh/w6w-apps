import type { ActionDefinition } from "@w6w/types";
import { FareHarborClient } from "../lib/client.ts";
import { companyParam, seg } from "../lib/params.ts";

interface Input {
  shortname: string;
}

const agentList: ActionDefinition<Input> = {
  key: "agent-list",
  type: "read",
  resource: "agent",
  title: "List Agents",
  description: "List the agents of an affiliate company. Affiliate keys only.",
  params: [
    companyParam,
  ],
  output: [
    { key: "agents", type: "array", label: "Records" },
  ],

  execute(input, ctx) {
    return new FareHarborClient(ctx).get(`/companies/${seg(input.shortname, "shortname")}/agents/`);
  },
};

export default agentList;
