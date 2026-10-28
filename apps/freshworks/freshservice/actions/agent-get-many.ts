import type { ActionDefinition } from "@w6w/types";
import { FreshserviceClient, unset } from "../lib/client.ts";
import { pagination } from "../lib/params.ts";

interface Input {
  email?: string;
  mobilePhoneNumber?: string;
  workPhoneNumber?: string;
  active?: boolean;
  state?: string;
  page?: number;
  perPage?: number;
}

const agentGetMany: ActionDefinition<Input> = {
  key: "agent-get-many",
  type: "search",
  resource: "agent",
  title: "List Agents",
  description: "List agents — the people who work tickets. Useful for resolving an assignee ID.",
  params: [
    { key: "email", label: "Email", type: "string" },
    { key: "mobilePhoneNumber", label: "Mobile phone", type: "string", row: "phone" },
    { key: "workPhoneNumber", label: "Work phone", type: "string", row: "phone" },
    { key: "active", label: "Active only", type: "boolean", row: "status" },
    {
      key: "state",
      label: "State",
      type: "select",
      row: "status",
      options: [
        { value: "fulltime", label: "Full-time" },
        { value: "occasional", label: "Occasional" },
      ],
    },
    ...pagination,
  ],
  output: [{ key: "agents", type: "array", label: "Agents" }],

  async execute(input, ctx) {
    const agents = await new FreshserviceClient(ctx).resource<unknown[]>("agents", "/agents", {
      query: {
        email: unset(input.email),
        mobile_phone_number: unset(input.mobilePhoneNumber),
        work_phone_number: unset(input.workPhoneNumber),
        active: input.active,
        state: unset(input.state),
        page: input.page,
        per_page: input.perPage,
      },
    });
    return { agents };
  },
};

export default agentGetMany;
