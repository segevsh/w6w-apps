import type { ActionDefinition } from "@w6w/types";
import { call, cleanContact, listResult, pick } from "../lib/client.ts";
import { cursorParam, listOutput, str } from "../lib/params.ts";

/** `GET /contacts` (cursor-paginated; optional `email` filter). */
type Input = { cursor?: string; email?: string };

const contactList: ActionDefinition<Input> = {
  key: "contact-list",
  type: "read",
  resource: "contact",
  title: "List Contacts",
  description:
    "List contacts (visitors identified by name, email or phone), one cursor page at a time. Optionally filter by email.",
  params: [
    str("email", "Email", { hint: "Only contacts with this email address." }),
    cursorParam,
  ],
  output: listOutput("Contacts"),
  async execute(input, ctx) {
    const body = await call(ctx, "GET", "/contacts", {
      query: pick(input, ["cursor", "email"]) as never,
    });
    return listResult(body, "contacts", cleanContact);
  },
};

export default contactList;
