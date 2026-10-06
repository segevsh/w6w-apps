import type { ActionDefinition } from "@w6w/types";
import { HospitableClient, listValue } from "../lib/client.ts";
import { includeParam, PAGED, PAGED_OUTPUT, PROPERTY_IDS } from "../lib/params.ts";

/** `GET /v2/inquiries` — Conversations that have no reservation attached yet. */
interface Input {
  property_ids: unknown;
  last_message_at?: string;
  include?: string;
  page?: number;
  per_page?: number;
}

const inquiryList: ActionDefinition<Input> = {
  key: "inquiry-list",
  type: "search",
  resource: "inquiry",
  title: "List Inquiries",
  description:
    "List pre-booking inquiries: inbox conversations with no reservation attached. A request to book is a reservation, not an inquiry.",
  params: [
    PROPERTY_IDS,
    {
      key: "last_message_at",
      label: "Last message after",
      type: "datetime",
      hint: "Inquiries whose last message is after this time.",
    },
    includeParam("guest, user, financials, listings, properties"),
    ...PAGED,
  ],
  output: PAGED_OUTPUT,

  execute(input, ctx) {
    return new HospitableClient(ctx).request("GET", "/inquiries", {
      query: {
        "properties[]": listValue(input.property_ids),
        last_message_at: input.last_message_at,
        include: input.include,
        page: input.page,
        per_page: input.per_page,
      },
    });
  },
};

export default inquiryList;
