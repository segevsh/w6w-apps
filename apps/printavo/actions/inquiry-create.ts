import type { ActionDefinition } from "@w6w/types";
import { compact, PrintavoClient } from "../lib/client.ts";
import { INQUIRY_FIELDS } from "../lib/fields.ts";

interface Input {
  name: string;
  email?: string;
  phone?: string;
  request?: string;
}

const inquiryCreate: ActionDefinition<Input> = {
  key: "inquiry-create",
  type: "perform",
  resource: "inquiry",
  title: "Create Inquiry",
  description: "Create an inquiry, e.g. from a web form (inquiryCreate).",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "email", label: "Email", type: "string" },
    { key: "phone", label: "Phone", type: "string" },
    { key: "request", label: "Request", type: "text" },
  ],
  output: [
    { key: "id", type: "string", label: "Inquiry ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  async execute(input, ctx) {
    const client = new PrintavoClient(ctx);
    const data = await client.query<{ inquiryCreate: unknown }>(
      `mutation($input: InquiryCreateInput!) { inquiryCreate(input: $input) { ${INQUIRY_FIELDS} } }`,
      {
        input: compact({
          name: input.name,
          email: input.email,
          phone: input.phone,
          request: input.request,
        }),
      },
    );
    return data.inquiryCreate;
  },
};

export default inquiryCreate;
