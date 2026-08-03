import type { ActionDefinition } from "@w6w/types";
import { PandaDocClient } from "../lib/client.ts";
import { resultsOutput } from "../lib/params.ts";

interface Input {
  email?: string;
}

/**
 * `GET /public/v1/contacts` — the workspace's contacts.
 *
 * `email` is the only filter PandaDoc documents on this route, and it is an
 * **exact match**, not a search — which makes this the natural "does this
 * contact already exist?" lookup before `contact-create`. There is no `count` /
 * `page` here: unlike documents and templates, this endpoint documents no
 * paging parameters, so none are invented.
 */
const contactGetMany: ActionDefinition<Input> = {
  key: "contact-get-many",
  type: "search",
  resource: "contact",
  title: "Get Many Contacts",
  description:
    "List contacts, optionally narrowed to one exact email address. Use it to check whether a contact exists before creating one.",
  params: [
    {
      key: "email",
      label: "Email",
      type: "string",
      hint: "Exact match, not a search. Omit to list every contact.",
    },
  ],
  output: resultsOutput,

  async execute(input, ctx) {
    return await new PandaDocClient(ctx).request("/contacts", {
      query: { email: input.email },
    });
  },
};

export default contactGetMany;
