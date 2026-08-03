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
 * `GET /v1/products` — the things being sold.
 *
 * A product is the deliverable — a course, a community, a coaching programme, a
 * downloadable. The priced wrapper around it is an *offer*; see `offer-list`
 * for why the distinction matters when granting access.
 *
 * ## `excludeProductTypes` takes fully-qualified Ruby class names
 *
 * The spec is unusually literal about this one: *"Exclude products by
 * productizable_type (fully-qualified, e.g. `Courses::CohortCourse`).
 * Repeatable."* That is a Kajabi-internal class name leaking into the public
 * API. The parameter is exposed because it is documented, but the hint quotes
 * the vendor's own example verbatim rather than inventing a friendlier
 * vocabulary that would not match anything.
 *
 * Only a single value is sent, though the parameter is declared repeatable —
 * this app has no verified example of Kajabi's expected serialisation for the
 * repeated form, and guessing between `[]=a&[]=b` and `=a,b` would produce a
 * filter that silently matches nothing. One value is enough for the documented
 * use and is unambiguous.
 */
interface Input {
  siteId?: string;
  titleContains?: string;
  descriptionContains?: string;
  status?: string;
  excludeProductType?: string;
  sort?: string;
  pageNumber?: number;
  pageSize?: number;
  fields?: string;
}

const productList: ActionDefinition<Input> = {
  key: "product-list",
  type: "search",
  resource: "product",
  title: "List Products",
  description: "List a site's products — courses, communities, coaching and downloads.",
  params: [
    siteFilterParam,
    { key: "titleContains", label: "Title contains", type: "string" },
    {
      key: "descriptionContains",
      label: "Description contains",
      type: "string",
      advanced: true,
    },
    {
      key: "status",
      label: "Status",
      type: "string",
      hint: "Sent as `filter[status_eq]`. Kajabi's documented example value is `ready`; the " +
        "spec publishes no full enum, so this is a free-text field rather than a guessed list.",
    },
    {
      key: "excludeProductType",
      label: "Exclude product type",
      type: "string",
      advanced: true,
      placeholder: "Courses::CohortCourse",
      hint: 'Kajabi: *"Exclude products by productizable_type (fully-qualified, e.g. ' +
        '`Courses::CohortCourse`)"*. A Kajabi-internal class name, quoted as documented.',
    },
    sortParam("title, description, status"),
    pageNumberParam,
    pageSizeParam,
    fieldsParam("products", "title,status"),
  ],
  output: collectionOutput,

  execute(input, ctx) {
    return new KajabiClient(ctx).request("/products", {
      query: {
        "filter[site_id]": unset(input.siteId),
        "filter[title_cont]": unset(input.titleContains),
        "filter[description_cont]": unset(input.descriptionContains),
        "filter[status_eq]": unset(input.status),
        "filter[exclude_product_types][]": unset(input.excludeProductType),
        sort: unset(input.sort),
        "page[number]": input.pageNumber,
        "page[size]": input.pageSize,
        "fields[products]": unset(input.fields),
      },
    });
  },
};

export default productList;
