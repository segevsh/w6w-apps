import type { ActionDefinition } from "@w6w/types";
import { AnchorClient, encodeId } from "../lib/client.ts";

/** `GET /contacts/{id}` — Anchor operation `getContact`. */
interface Input {
  id: string;
}

const contactGet: ActionDefinition<Input> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Fetch one contact: primary person, company name, phone and metadata.",
  params: [
    { key: "id", label: "Contact ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "firstName", type: "string", label: "First name" },
    { key: "lastName", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
    { key: "companyName", type: "string", label: "Company name" },
    { key: "phone", type: "string", label: "Phone" },
    { key: "metadata", type: "object", label: "Metadata" },
  ],

  execute(input, ctx) {
    return new AnchorClient(ctx).request("GET", `/contacts/${encodeId(input.id)}`);
  },
};

export default contactGet;
