import type { ActionDefinition } from "@w6w/types";
import { XeroClient } from "../lib/client.ts";
import { contactId } from "../lib/params.ts";

interface Input {
  contactId: string;
}

const contactGet: ActionDefinition<Input> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Retrieve one contact by its ContactID.",
  params: [contactId],
  // Xero wraps even a single-record lookup in the same array envelope as a list.
  output: [{ key: "Contacts", type: "array", label: "Contacts" }],

  execute(input, ctx) {
    return new XeroClient(ctx).request(`/Contacts/${encodeURIComponent(input.contactId)}`);
  },
};

export default contactGet;
