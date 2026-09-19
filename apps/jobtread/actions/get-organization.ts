import type { ActionDefinition } from "@w6w/types";
import { JobTreadClient } from "../lib/client.ts";

interface Input {
  organizationId: string;
}

interface OrganizationResponse {
  organization: { id: string; name: string; createdAt: string } | null;
}

const getOrganization: ActionDefinition<Input> = {
  key: "get-organization",
  type: "read",
  resource: "organization",
  title: "Get Organization",
  description: "Read an organization by id (id/name/createdAt — confirmed live 2026-09-15).",
  params: [
    {
      key: "organizationId",
      label: "Organization ID",
      type: "string",
      required: true,
      hint: 'The JobTreadID shown as "Org ID" in JobTread, or from Get Current User\'s ' +
        "organizations list.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Organization ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "createdAt", type: "string", label: "Created At" },
  ],

  async execute(input, ctx) {
    const client = new JobTreadClient(ctx);
    const res = await client.query<OrganizationResponse>({
      organization: { $: { id: input.organizationId }, id: {}, name: {}, createdAt: {} },
    });
    if (!res.organization) throw new Error(`organization ${input.organizationId} not found`);
    return res.organization;
  },
};

export default getOrganization;
