import type { ActionDefinition } from "@w6w/types";
import { CallRailClient, encodeId } from "../lib/client.ts";
import { accountIdParam, fieldsParam } from "../lib/params.ts";

/** `GET /v3/a/{account_id}/companies/{company_id}.json` — a single company. */
interface Input {
  accountId: string;
  companyId: string;
  fields?: string;
}

const companyGet: ActionDefinition<Input> = {
  key: "company-get",
  type: "read",
  resource: "company",
  title: "Get Company",
  description: "Fetch a single company by id.",
  params: [
    accountIdParam,
    {
      key: "companyId",
      label: "Company ID",
      type: "string",
      required: true,
      placeholder: "COM8154748ae6bd4e278a7cddd38a662f4f",
    },
    { ...fieldsParam, hint: "e.g. verified_caller_ids." },
  ],
  output: [
    { key: "id", type: "string", label: "Company ID" },
    { key: "name", type: "string", label: "Company name" },
    { key: "status", type: "string", label: "active or disabled" },
    { key: "time_zone", type: "string", label: "Time zone" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "script_url", type: "string", label: "Tracking script URL" },
  ],

  execute(input, ctx) {
    return new CallRailClient(ctx).json(
      `/a/${encodeId(input.accountId)}/companies/${encodeId(input.companyId)}.json`,
      { query: { fields: input.fields } },
    );
  },
};

export default companyGet;
