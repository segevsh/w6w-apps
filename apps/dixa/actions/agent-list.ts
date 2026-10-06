import type { ActionDefinition } from "@w6w/types";
import { DixaClient } from "../lib/client.ts";
import { pagedGet, pagedOutput, pageParams } from "../lib/params.ts";

interface Input {
  email?: string;
  phone?: string;
  pageLimit?: number;
  pageKey?: string;
}

const agentList: ActionDefinition<Input> = {
  key: "agent-list",
  type: "search",
  resource: "agent",
  title: "List Agents",
  description:
    "List the agents and admins in the organisation. The email and phone filters are mutually exclusive — Dixa errors if both are given.",
  params: [
    { key: "email", label: "Email", type: "string" },
    { key: "phone", label: "Phone number", type: "string" },
    ...pageParams,
  ],
  output: [...pagedOutput],

  execute(input, ctx) {
    const email = input.email?.trim();
    const phone = input.phone?.trim();
    if (email && phone) throw new Error("email and phone are mutually exclusive");
    return pagedGet(new DixaClient(ctx), "/agents", {
      email,
      phone,
      pageLimit: input.pageLimit,
      pageKey: input.pageKey,
    });
  },
};

export default agentList;
