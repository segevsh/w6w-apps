import type { ActionDefinition } from "@w6w/types";
import { asJson, asObject, ClientifyClient, compact } from "../lib/client.ts";

/**
 * `PUT /v1/companies/{companyId}/` — Update a company (PUT). Clientify's own example sends only the fields being changed.
 */
interface Input {
  companyId: string;
  name?: string;
  businessName?: string;
  emails?: unknown;
  phones?: unknown;
  websites?: unknown;
  extra?: unknown;
}

const companyUpdate: ActionDefinition<Input, unknown> = {
  key: "company-update",
  type: "perform",
  resource: "company",
  title: "Update Company",
  description:
    "Update a company (PUT). Clientify's own example sends only the fields being changed.",
  idempotent: true,
  params: [
    { key: "companyId", label: "Company ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string" },
    { key: "businessName", label: "Business name", type: "string" },
    {
      key: "emails",
      label: "Emails",
      type: "json",
      hint: 'JSON array, e.g. [{"type":1,"email":"team@example.com"}].',
    },
    { key: "phones", label: "Phones", type: "json" },
    { key: "websites", label: "Websites", type: "json" },
    {
      key: "extra",
      label: "Extra fields",
      type: "json",
      hint:
        "Further body fields as a JSON object (anything the Clientify API accepts that is not listed above, e.g. custom_fields). Named parameters win on a clash.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Record id" },
    { key: "url", type: "string", label: "Record URL" },
    { key: "name", type: "string", label: "Company name" },
  ],

  execute(input, ctx) {
    const client = new ClientifyClient(ctx);
    return client.request(`/v1/companies/${encodeURIComponent(input.companyId)}/`, {
      method: "PUT",
      body: compact({
        ...asObject(input.extra, "extra"),
        name: input.name,
        business_name: input.businessName,
        emails: asJson(input.emails),
        phones: asJson(input.phones),
        websites: asJson(input.websites),
      }),
    });
  },
};

export default companyUpdate;
