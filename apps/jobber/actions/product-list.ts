import type { ActionDefinition } from "@w6w/types";
import { csv, JobberClient, optionalInput, PAGE_INFO, PRODUCT_FIELDS } from "../lib/client.ts";

interface Input {
  searchTerm?: string;
  category?: string;
  ids?: string;
  showInactive?: boolean;
  first?: number;
  after?: string;
}

const QUERY = `
  query ListProducts(
    $filter: ProductsFilterInput
    $searchTerm: String
    $showInactive: Boolean
    $first: Int
    $after: String
  ) {
    products(
      filter: $filter
      searchTerm: $searchTerm
      showInactive: $showInactive
      first: $first
      after: $after
    ) {
      nodes { ${PRODUCT_FIELDS} }
      ${PAGE_INFO}
    }
  }
`;

/**
 * The account's price book — the catalogue quote and job line items reference.
 *
 * Two naming traps, both Jobber's:
 *
 *   - The query is `products`, the type is `ProductOrService`, and the
 *     mutations are `productsAndServicesCreate` / `…Edit`. Three names, one
 *     concept.
 *   - The **filter** takes `category: [WorkItemCategoryTypeEnum!]` while the
 *     **field on the record** is `category: ProductsAndServicesCategory`. Two
 *     enums for the same idea, and the changelog shows Jobber migrating between
 *     them (2024-06-10 moved `ProductsAndServicesEditInput.category` from the
 *     first to the second). Both currently spell the values `PRODUCT` and
 *     `SERVICE`, which is what the options below offer.
 */
const productList: ActionDefinition<Input> = {
  key: "product-list",
  type: "search",
  resource: "product",
  title: "List Products and Services",
  description:
    "List the account's price-book entries with their default unit cost, markup and taxability.",
  params: [
    { key: "searchTerm", label: "Search", type: "string" },
    {
      key: "category",
      label: "Category",
      type: "select",
      options: [
        { value: "PRODUCT", label: "Product" },
        { value: "SERVICE", label: "Service" },
      ],
    },
    {
      key: "ids",
      label: "IDs",
      type: "string",
      hint: "Comma-separated EncodedIds, to resolve a known set in one call.",
      advanced: true,
    },
    {
      key: "showInactive",
      label: "Include hidden entries",
      type: "boolean",
      default: false,
      hint:
        "Jobber's default is false. Hidden entries stay on historic line items but are no longer suggested.",
      advanced: true,
    },
    {
      key: "first",
      label: "Page size",
      type: "number",
      default: 50,
      validation: { min: 1, max: 100, integer: true },
    },
    { key: "after", label: "Cursor", type: "string" },
  ],
  output: [{
    key: "products",
    type: "object",
    label: "Page of products and services with pageInfo",
  }],

  execute(input, ctx) {
    return new JobberClient(ctx).query(QUERY, {
      filter: optionalInput({
        category: input.category ? [input.category] : undefined,
        ids: csv(input.ids),
      }),
      searchTerm: input.searchTerm,
      showInactive: input.showInactive ?? false,
      first: input.first ?? 50,
      after: input.after,
    });
  },
};

export default productList;
