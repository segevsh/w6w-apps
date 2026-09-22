import type { ActionDefinition } from "@w6w/types";
import { bool, SendfoxClient, toIdList } from "../lib/client.ts";
import { contactFilterSection, perPageParam } from "../lib/params.ts";

/**
 * `GET /contacts` — a page of contacts, or a count.
 *
 * ## `count_only` is the cheapest useful call in this API
 *
 * With `count_only=true` the response is `{count, filter}` instead of a page —
 * one integer and the human-readable rendering of the filter that produced it.
 * That is how a workflow sizes an audience ("how many contacts opened nothing
 * this year") before deciding whether to act on it, without paging the account.
 *
 * ## The filter grammar is AND-ed
 *
 * Every `filter[...]` condition is AND-ed, per the document. The id-array
 * filters (`inListIds`, `notInListIds`, `tagIds`, `notTagIds`) are OpenAPI
 * arrays in the default `style: form, explode: true` form, so they go on the
 * wire as a repeated key — see `lib/client.ts`.
 *
 * ## Pagination is shallow
 *
 * `per_page` (1–1000) is the only paging control the document gives this
 * endpoint; there is no `page` parameter, so reaching past the first page means
 * narrowing the filter or raising `per_page`. The response does carry
 * `current_page`, `total` and `per_page`, so that is visible rather than
 * guessed at.
 */
interface Input {
  query?: string;
  unsubscribed?: boolean;
  email?: string;
  perPage?: number;
  countOnly?: boolean;
  status?: string;
  lastOpenedAfter?: string;
  lastOpenedBefore?: string;
  lastClickedAfter?: string;
  lastClickedBefore?: string;
  lastSentAfter?: string;
  lastSentBefore?: string;
  createdAfter?: string;
  createdBefore?: string;
  neverOpened?: boolean;
  neverClicked?: boolean;
  neverSent?: boolean;
  inListIds?: number[];
  notInListIds?: number[];
  tagIds?: number[];
  notTagIds?: number[];
}

const contactList: ActionDefinition<Input> = {
  key: "contact-list",
  type: "search",
  resource: "contact",
  title: "List Contacts",
  description: "List contacts with SendFox's engagement filters, or count them with `count_only`.",
  params: [
    {
      key: "query",
      label: "Search",
      type: "string",
      hint: "Free-text search across the account's contacts.",
    },
    {
      key: "email",
      label: "Email",
      type: "string",
      hint: "Filter to one specific email address.",
    },
    {
      key: "unsubscribed",
      label: "Unsubscribed only",
      type: "boolean",
      hint: "Turn on to return only unsubscribed contacts; leave off to include everyone.",
    },
    {
      key: "countOnly",
      label: "Count only",
      type: "boolean",
      hint: "Return just the number of matching contacts, with no contact records. The cheapest " +
        "way to size an audience — the response is `{count, filter}` instead of a page.",
    },
    perPageParam,
    contactFilterSection(),
  ],
  output: [
    { key: "data", type: "array", label: "Contacts (absent when Count only)" },
    { key: "current_page", type: "number", label: "Page number" },
    { key: "total", type: "number", label: "Total matching contacts" },
    { key: "per_page", type: "number", label: "Contacts per page" },
    { key: "count", type: "number", label: "Matching contacts (Count only)" },
    { key: "filter", type: "string", label: "Rendered filter (Count only)" },
  ],

  execute(input, ctx) {
    return new SendfoxClient(ctx).json("/contacts", {
      query: {
        query: input.query,
        email: input.email,
        unsubscribed: bool(input.unsubscribed),
        count_only: bool(input.countOnly),
        per_page: input.perPage,
        "filter[status]": input.status,
        "filter[last_opened_after]": input.lastOpenedAfter,
        "filter[last_opened_before]": input.lastOpenedBefore,
        "filter[last_clicked_after]": input.lastClickedAfter,
        "filter[last_clicked_before]": input.lastClickedBefore,
        "filter[last_sent_after]": input.lastSentAfter,
        "filter[last_sent_before]": input.lastSentBefore,
        "filter[created_after]": input.createdAfter,
        "filter[created_before]": input.createdBefore,
        "filter[never_opened]": bool(input.neverOpened),
        "filter[never_clicked]": bool(input.neverClicked),
        "filter[never_sent]": bool(input.neverSent),
        "filter[in_list_ids]": toIdList(input.inListIds),
        "filter[not_in_list_ids]": toIdList(input.notInListIds),
        "filter[tag_ids]": toIdList(input.tagIds),
        "filter[not_tag_ids]": toIdList(input.notTagIds),
      },
    });
  },
};

export default contactList;
