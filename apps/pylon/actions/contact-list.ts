import type { ActionDefinition } from "@w6w/types";
import { PylonClient } from "../lib/client.ts";
import { cursorParam, limitParam, PAGE_OUTPUT } from "../lib/params.ts";

interface Input {
  cursor?: string;
  limit?: number;
}

/** `GET /contacts` — cursor pagination, default 100. */
const contactList: ActionDefinition<Input> = {
  key: "contact-list",
  type: "search",
  resource: "contact",
  title: "List Contacts",
  description: "List contacts one cursor page at a time.",
  params: [cursorParam, limitParam()],
  output: [{ key: "contacts", type: "array", label: "Contacts on this page" }, ...PAGE_OUTPUT],

  async execute(input, ctx) {
    const { items, ...page } = await new PylonClient(ctx).list("GET", "/contacts", {
      query: { cursor: input.cursor, limit: input.limit },
    });
    return { contacts: items, ...page };
  },
};

export default contactList;
