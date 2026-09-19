import type { ActionDefinition } from "@w6w/types";
import { JobTreadClient } from "../lib/client.ts";

interface Input {
  accountId: string;
  name: string;
  address?: string;
}

interface CreateLocationResponse {
  createLocation: { createdLocation: { id: string; name: string; address: string } };
}

const createLocation: ActionDefinition<Input> = {
  key: "create-location",
  type: "perform",
  resource: "location",
  title: "Create Location",
  description:
    "Create a location (job site) under a customer account. `accountId` and `name` confirmed " +
    "live (2026-09-15) as the required fields — the query reached a real permission check " +
    '("You don\'t have permission to create a location for this account") once both were present.',
  idempotent: false,
  params: [
    { key: "accountId", label: "Account ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string", required: true },
    { key: "address", label: "Address", type: "string" },
  ],
  output: [
    { key: "id", type: "string", label: "Location ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "address", type: "string", label: "Address" },
  ],

  async execute(input, ctx) {
    const args: Record<string, unknown> = { accountId: input.accountId, name: input.name };
    if (input.address !== undefined) args.address = input.address;

    const client = new JobTreadClient(ctx);
    const res = await client.query<CreateLocationResponse>({
      createLocation: {
        $: args,
        createdLocation: { id: {}, name: {}, address: {} },
      },
    });
    return res.createLocation.createdLocation;
  },
};

export default createLocation;
