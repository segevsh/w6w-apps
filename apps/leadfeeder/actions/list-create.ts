import type { ActionDefinition } from "@w6w/types";
import { LeadfeederClient, reply } from "../lib/client.ts";
import { accountIdParam, dataOutput, metaOutput } from "../lib/params.ts";

interface Input {
  accountId: string;
  name: string;
  scope: string;
}

/** `POST /v1/lists` — verified against the vendor OpenAPI document (2026-10-06). */
const listCreate: ActionDefinition<Input> = {
  key: "list-create",
  type: "perform",
  resource: "list",
  idempotent: false,
  title: "Create List",
  description: "Create an empty company or contact list.",
  params: [
    accountIdParam,
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "scope",
      label: "Scope",
      type: "select",
      required: true,
      hint: "Whether the list holds companies or contacts.",
      options: [{ value: "company", label: "Company" }, { value: "contact", label: "Contact" }],
      default: "company",
    },
  ],
  output: [
    dataOutput,
    metaOutput,
  ],

  async execute(input, ctx) {
    const path = "/v1/lists";
    const query = { account_id: input.accountId };
    const body = { data: { type: "list", attributes: { name: input.name, scope: input.scope } } };
    return reply(await new LeadfeederClient(ctx).request("POST", path, { query, body }));
  },
};

export default listCreate;
