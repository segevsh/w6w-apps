import type { ActionDefinition } from "@w6w/types";
import { KajabiClient, unset } from "../lib/client.ts";
import {
  collectionOutput,
  fieldsParam,
  pageNumberParam,
  pageSizeParam,
  siteFilterParam,
  sortParam,
} from "../lib/params.ts";

/**
 * `GET /v1/offers` — what is for sale.
 *
 * ## Offer vs product, which this API keeps strictly apart
 *
 * A **product** is the thing (a course, a community, a downloadable). An
 * **offer** is the commercial wrapper around one or more products — the price,
 * the terms, the checkout. That is why `offer-product-list` exists as a
 * relationship route: one offer can grant several products, and one product can
 * be sold through several offers at different prices.
 *
 * It matters in practice because access is granted at the **offer** level:
 * `contact-offer-grant` takes offer ids, not product ids. This is the action
 * that supplies them.
 */
interface Input {
  siteId?: string;
  titleContains?: string;
  descriptionContains?: string;
  sort?: string;
  pageNumber?: number;
  pageSize?: number;
  fields?: string;
}

const offerList: ActionDefinition<Input> = {
  key: "offer-list",
  type: "search",
  resource: "offer",
  title: "List Offers",
  description:
    "List a site's offers — the priced, sellable wrappers around products. `contact-offer-grant` " +
    "takes the ids this returns.",
  params: [
    siteFilterParam,
    { key: "titleContains", label: "Title contains", type: "string" },
    {
      key: "descriptionContains",
      label: "Description contains",
      type: "string",
      advanced: true,
    },
    sortParam("title, price_in_cents"),
    pageNumberParam,
    pageSizeParam,
    fieldsParam("offers", "title,price_in_cents"),
  ],
  output: collectionOutput,

  execute(input, ctx) {
    return new KajabiClient(ctx).request("/offers", {
      query: {
        "filter[site_id]": unset(input.siteId),
        "filter[title_cont]": unset(input.titleContains),
        "filter[description_cont]": unset(input.descriptionContains),
        sort: unset(input.sort),
        "page[number]": input.pageNumber,
        "page[size]": input.pageSize,
        "fields[offers]": unset(input.fields),
      },
    });
  },
};

export default offerList;
