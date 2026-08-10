import type { ActionDefinition } from "@w6w/types";
import { definedQuery, extraFilters, KajabiClient, unset } from "../lib/client.ts";
import {
  collectionOutput,
  extraFiltersParam,
  fieldsParam,
  pageNumberParam,
  pageSizeParam,
  siteFilterParam,
  sortParam,
} from "../lib/params.ts";

/**
 * `GET /v1/contacts` — the audience list.
 *
 * ## Contacts and customers are different collections here
 *
 * Kajabi exposes both `/v1/contacts` and `/v1/customers`, with near-identical
 * filter sets. They are not aliases: a contact is anyone on the list (an opt-in
 * from a form, an imported address), while a customer is the purchasing
 * identity — which is why `/v1/orders` and `/v1/purchases` filter by
 * `customer_id` and never by `contact_id`. Reach for `customer-list` when the
 * question is about money and `contact-list` when it is about the audience.
 *
 * ## The filter surface is enormous, so most of it is passed through
 *
 * Kajabi documents **75+** `filter[…]` parameters on this one endpoint. The
 * dozen that carry the common cases are real params below; everything else goes
 * through `Additional filters`. See `extraFilters` in `lib/client.ts` for why
 * that trade was made rather than rendering seventy-five form fields.
 */
interface Input {
  siteId?: string;
  search?: string;
  emailContains?: string;
  nameContains?: string;
  createdInLast?: number;
  subscribed?: boolean;
  hasTagId?: string;
  hasNoTagId?: string;
  hasOfferId?: string;
  hasProductId?: string;
  hasActiveProductId?: string;
  filters?: string;
  sort?: string;
  pageNumber?: number;
  pageSize?: number;
  fields?: string;
}

const contactList: ActionDefinition<Input> = {
  key: "contact-list",
  type: "search",
  resource: "contact",
  title: "List Contacts",
  description:
    "Search and page through contacts. Covers the common filters directly and forwards any of " +
    "Kajabi's other documented `filter[…]` parameters.",
  params: [
    siteFilterParam,
    {
      key: "search",
      label: "Search",
      type: "string",
      hint: "Fuzzy search across name and email (`filter[search]`).",
    },
    { key: "nameContains", label: "Name contains", type: "string", advanced: true },
    { key: "emailContains", label: "Email contains", type: "string", advanced: true },
    {
      key: "createdInLast",
      label: "Created in last (days)",
      type: "number",
      validation: { integer: true, min: 1 },
    },
    { key: "subscribed", label: "Subscribed only", type: "boolean", advanced: true },
    {
      key: "hasTagId",
      label: "Has tag ID",
      type: "string",
      hint: "`tag-list` returns the ids.",
    },
    { key: "hasNoTagId", label: "Does not have tag ID", type: "string", advanced: true },
    {
      key: "hasOfferId",
      label: "Has offer ID",
      type: "string",
      advanced: true,
      hint: "`offer-list` returns the ids.",
    },
    { key: "hasProductId", label: "Owns product ID", type: "string", advanced: true },
    {
      key: "hasActiveProductId",
      label: "Has active membership to product ID",
      type: "string",
      advanced: true,
      hint: "Narrower than *Owns product ID* — excludes lapsed and revoked access.",
    },
    extraFiltersParam(
      "Kajabi documents 75+ filters on this endpoint, e.g. `net_revenue_greater_than`, " +
        "`opened_email_in_last`, `submitted_form_id`, `never_subscribed`.",
    ),
    sortParam("name, email, created_at"),
    pageNumberParam,
    pageSizeParam,
    fieldsParam("contacts", "name,email"),
  ],
  output: collectionOutput,

  execute(input, ctx) {
    return new KajabiClient(ctx).request("/contacts", {
      query: {
        ...extraFilters(input.filters, "Additional filters"),
        ...definedQuery({
          "filter[site_id]": unset(input.siteId),
          "filter[search]": unset(input.search),
          "filter[name_contains]": unset(input.nameContains),
          "filter[email_contains]": unset(input.emailContains),
          "filter[created_in_last]": input.createdInLast,
          "filter[subscribed]": input.subscribed,
          "filter[has_tag_id]": unset(input.hasTagId),
          "filter[has_no_tag_id]": unset(input.hasNoTagId),
          "filter[has_offer_id]": unset(input.hasOfferId),
          "filter[has_product_id]": unset(input.hasProductId),
          "filter[has_active_product_id]": unset(input.hasActiveProductId),
          sort: unset(input.sort),
          "page[number]": input.pageNumber,
          "page[size]": input.pageSize,
          "fields[contacts]": unset(input.fields),
        }),
      },
    });
  },
};

export default contactList;
