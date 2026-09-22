import type { ActionDefinition } from "@w6w/types";
import { SimpleTextingClient } from "../lib/client.ts";
import { directionParam, paginationParams, sinceParam } from "../lib/params.ts";

/**
 * `GET /api/contacts` — "Get all Contacts".
 *
 * A page of `Contact` rows. Two fields are easy to get wrong:
 *
 * - The identifier is **`contactId`**, not `id` — every *create* endpoint in
 *   this API answers `{id}`, but a fetched contact spells it out. The value is
 *   what `contact-get`, `contact-update` and `contact-delete` address.
 * - `updateSource` is an enum of eleven values
 *   (`IMPORTED_FROM_FILE`, `PUBLIC_API`, `KEYWORD`, `WEB_FORM`, `MANUAL`,
 *   `CONFIRMATION`, `INCOMING_MESSAGE`, `MAILCHIMP_SYNC`, `REMINDER`, `ZAPIER`,
 *   `WORKATO`) recording *how* the row last changed. `PUBLIC_API` is what a row
 *   this app touched will say, which makes it the field to branch on when
 *   reconciling API-written contacts against ones a keyword or a web form
 *   created.
 *
 * `subscriptionStatus` is the other one worth filtering on, and it can only be
 * filtered after the read: this endpoint declares no status filter, and a page
 * mixes `OPT_IN`, `OPT_OUT`, `WAIT_SMS_CONFIRMATION` and
 * `REJECT_CONFIRMATION` contacts. Pagination is by the `updated` field, so a
 * page is not a stable snapshot while contacts are being edited.
 */
interface Input {
  page?: number;
  size?: number;
  since?: string;
  direction?: string;
}

const contactList: ActionDefinition<Input> = {
  key: "contact-list",
  type: "search",
  resource: "contact",
  title: "List Contacts",
  description: "List contacts on the account, optionally only those updated since a timestamp.",
  params: [
    ...paginationParams(),
    sinceParam,
    directionParam,
  ],
  output: [
    { key: "content", type: "array", label: "Contacts" },
    { key: "totalPages", type: "number", label: "Total pages" },
    { key: "totalElements", type: "number", label: "Total elements" },
  ],

  execute(input, ctx) {
    return new SimpleTextingClient(ctx).page("/api/contacts", {
      query: {
        page: input.page,
        size: input.size,
        since: input.since,
        direction: input.direction,
      },
    });
  },
};

export default contactList;
