import type { ActionDefinition } from "@w6w/types";
import { compact, jsonObject, NetSuiteClient, recordPath, writeResult } from "../lib/client.ts";
import { additionalFieldsParam, ref, writeOutput } from "../lib/params.ts";

interface Input {
  isPerson?: boolean;
  companyName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  subsidiary?: string;
  externalId?: string;
  additionalFields?: unknown;
}

/**
 * Create a `customer` — the body Oracle's own "Creating a Record Instance" / "Using External IDs"
 * examples use (`companyName`, `firstName`, `lastName`, `isPerson`, `externalId`,
 * `subsidiary: {id}`), with the reference field built from a plain id. Anything else goes through
 * `additionalFields`. Which fields are mandatory depends on the account (OneWorld accounts
 * require a subsidiary; person customers need a first and last name), and NetSuite reports a
 * missing one itself.
 */
const customerCreate: ActionDefinition<Input> = {
  key: "customer-create",
  type: "perform",
  resource: "customer",
  title: "Create Customer",
  description: "Create a customer (company or individual).",
  idempotent: false,
  params: [
    { key: "isPerson", label: "Individual", type: "boolean", default: false },
    { key: "companyName", label: "Company name", type: "string", row: "name" },
    { key: "firstName", label: "First name", type: "string", row: "person" },
    { key: "lastName", label: "Last name", type: "string", row: "person" },
    { key: "email", label: "Email", type: "string" },
    {
      key: "subsidiary",
      label: "Subsidiary ID",
      type: "string",
      hint: "Internal id of the subsidiary. Required on OneWorld accounts.",
    },
    {
      key: "externalId",
      label: "External ID",
      type: "string",
      hint: "Optional; lets you address the customer as `eid:<id>` later.",
    },
    additionalFieldsParam,
  ],
  output: writeOutput,

  async execute(input, ctx) {
    const body = {
      ...compact({
        isPerson: input.isPerson ? true : undefined,
        companyName: input.companyName,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        subsidiary: input.subsidiary ? ref(input.subsidiary) : undefined,
        externalId: input.externalId,
      }),
      ...jsonObject(input.additionalFields, "additionalFields"),
    };
    if (Object.keys(body).length === 0) {
      throw new Error("Give the customer at least a name.");
    }
    const client = new NetSuiteClient(ctx);
    return writeResult(await client.request(recordPath("customer"), { method: "POST", body }));
  },
};

export default customerCreate;
