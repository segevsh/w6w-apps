import type { ActionDefinition } from "@w6w/types";
import { call, encodeId, listResult, pick } from "../lib/client.ts";
import { cursorParam, listOutput, str } from "../lib/params.ts";

/** `GET /contacts/{contactId}/viewed-pages` (last 30 days). */
type Input = { contact_id: string; cursor?: string };

const contactViewedPagesList: ActionDefinition<Input> = {
  key: "contact-viewed-pages-list",
  type: "read",
  resource: "contact",
  title: "List Contact Viewed Pages",
  description: "List pages a contact viewed on your website in the past 30 days.",
  params: [str("contact_id", "Contact ID", { required: true }), cursorParam],
  output: listOutput("Viewed pages [{url, viewed_at}]"),
  async execute(input, ctx) {
    const body = await call(ctx, "GET", `/contacts/${encodeId(input.contact_id)}/viewed-pages`, {
      query: pick(input, ["cursor"]) as never,
    });
    return listResult(body, "viewed_pages");
  },
};

export default contactViewedPagesList;
