import type { ActionDefinition } from "@w6w/types";
import { CallRailClient, encodeId } from "../lib/client.ts";
import { accountIdParam } from "../lib/params.ts";

/** `POST /v3/a/{account_id}/companies.json` — Creating a Company. */
interface Input {
  accountId: string;
  name: string;
  timeZone?: string;
}

const companyCreate: ActionDefinition<Input> = {
  key: "company-create",
  type: "perform",
  resource: "company",
  title: "Create Company",
  description: "Create a new company within a CallRail account.",
  idempotent: false,
  params: [
    accountIdParam,
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "timeZone",
      label: "Time zone",
      type: "string",
      placeholder: "America/New_York",
      hint: "An IANA time zone name.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Company ID" },
    { key: "name", type: "string", label: "Company name" },
    { key: "status", type: "string", label: "active or disabled" },
    { key: "created_at", type: "string", label: "Created at" },
  ],

  execute(input, ctx) {
    return new CallRailClient(ctx).json(`/a/${encodeId(input.accountId)}/companies.json`, {
      method: "POST",
      body: { name: input.name, time_zone: input.timeZone },
    });
  },
};

export default companyCreate;
