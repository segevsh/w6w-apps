import type { ActionDefinition } from "@w6w/types";
import { FreshserviceClient, unset } from "../lib/client.ts";
import { pagination } from "../lib/params.ts";

interface Input {
  email?: string;
  mobilePhoneNumber?: string;
  workPhoneNumber?: string;
  includeAgents?: boolean;
  page?: number;
  perPage?: number;
}

const requesterGetMany: ActionDefinition<Input> = {
  key: "requester-get-many",
  type: "search",
  resource: "requester",
  title: "List Requesters",
  description:
    "List requesters — the people who raise tickets. Called Contacts in Freshservice for MSPs.",
  params: [
    { key: "email", label: "Email", type: "string", row: "match" },
    { key: "mobilePhoneNumber", label: "Mobile phone", type: "string", row: "phone" },
    { key: "workPhoneNumber", label: "Work phone", type: "string", row: "phone" },
    {
      key: "includeAgents",
      label: "Include agents",
      type: "boolean",
      advanced: true,
      hint: "Agents are excluded by default even though they are users too.",
    },
    ...pagination,
  ],
  output: [{ key: "requesters", type: "array", label: "Requesters" }],

  async execute(input, ctx) {
    const requesters = await new FreshserviceClient(ctx).resource<unknown[]>(
      "requesters",
      "/requesters",
      {
        query: {
          email: unset(input.email),
          mobile_phone_number: unset(input.mobilePhoneNumber),
          work_phone_number: unset(input.workPhoneNumber),
          include_agents: input.includeAgents,
          page: input.page,
          per_page: input.perPage,
        },
      },
    );
    return { requesters };
  },
};

export default requesterGetMany;
