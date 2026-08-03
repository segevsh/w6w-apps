import type { ActionDefinition } from "@w6w/types";
import { compact, csv, JobberClient, REQUEST_FIELDS, unwrap } from "../lib/client.ts";

interface Input {
  clientId: string;
  propertyId?: string;
  title?: string;
  referringClientId?: string;
  salespersonId?: string;
  formIds?: string;
}

const MUTATION = `
  mutation CreateRequest($input: RequestCreateInput!) {
    requestCreate(input: $input) {
      request { ${REQUEST_FIELDS} }
      userErrors { message path }
    }
  }
`;

/**
 * `RequestCreateInput.source` is deliberately not exposed.
 *
 * It is a `RequestSource` enum naming the channel a request came in through,
 * and Jobber's own description of the neighbouring `requestDetails` field is
 * "only to be provided by external apps". Letting a workflow claim an arbitrary
 * origin would corrupt the attribution reporting the field exists to feed. A
 * request created through this app is created by an integration, and Jobber
 * records it as such.
 *
 * The assessment and custom-form inputs (`assessment`, `customFormInput`,
 * `lineItems`) are also left off: each is a nested structure that only makes
 * sense against a specific account's form templates, and a half-filled one is
 * worse than none. `graphql-query` reaches them.
 */
const requestCreate: ActionDefinition<Input> = {
  key: "request-create",
  type: "perform",
  resource: "request",
  title: "Create Request",
  description:
    "Create a work request against a client — the inbound step a quote is built from. Defaults to the client's most recent property when none is given.",
  idempotent: false,
  params: [
    { key: "clientId", label: "Client ID", type: "string", required: true },
    {
      key: "propertyId",
      label: "Property ID",
      type: "string",
      hint: "Defaults to the client's last-used property when omitted.",
    },
    { key: "title", label: "Title", type: "string" },
    {
      key: "referringClientId",
      label: "Referring client ID",
      type: "string",
      hint: "The client who referred this work, if any.",
      advanced: true,
    },
    { key: "salespersonId", label: "Salesperson user ID", type: "string", advanced: true },
    {
      key: "formIds",
      label: "Form template IDs",
      type: "string",
      hint: "Comma-separated EncodedIds of job form templates to attach.",
      advanced: true,
    },
  ],
  output: [{ key: "request", type: "object", label: "The created request" }],

  async execute(input, ctx) {
    const data = await new JobberClient(ctx).query<Record<string, unknown>>(MUTATION, {
      input: compact({
        clientId: input.clientId,
        propertyId: input.propertyId,
        title: input.title,
        referringClientId: input.referringClientId,
        salespersonId: input.salespersonId,
        formIds: csv(input.formIds),
      }),
    });
    return unwrap(data, "requestCreate");
  },
};

export default requestCreate;
