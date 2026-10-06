import type { ActionDefinition } from "@w6w/types";
import { ClearoutClient } from "../lib/client.ts";
import { mapLead } from "../lib/lead.ts";

interface Input {
  email: string;
}

/** `GET /reverse_lookup/email?email_address=` — the query parameter is `email_address`. */
const reverseLookupEmail: ActionDefinition<Input> = {
  key: "reverse-lookup-email",
  type: "read",
  resource: "person",
  title: "Reverse Lookup Email",
  description: "Look up the person behind an email address: name, title, company, LinkedIn " +
    "profile and location. Costs a credit when a person is found.",
  params: [{ key: "email", label: "Email", type: "string", required: true }],
  output: [
    { key: "emailAddress", type: "string", label: "Email address" },
    { key: "lead", type: "object", label: "Person: name, title, company, linkedinUrl, addresses" },
  ],

  async execute(input, ctx) {
    const email = String(input.email ?? "").trim();
    if (!email) throw new Error("email is required");
    const { data } = await new ClearoutClient(ctx).request("/reverse_lookup/email", {
      query: { email_address: email },
    });
    const d = (data ?? {}) as { email_address?: string; lead?: unknown };
    return { emailAddress: d.email_address ?? email, lead: mapLead(d.lead) };
  },
};

export default reverseLookupEmail;
