import type { ActionDefinition } from "@w6w/types";
import { BUSINESS_INFORMATION_URL, GoogleBusinessProfileClient } from "../lib/client.ts";

interface Input {
  parent?: string;
  categoryName?: string;
  regionCode?: string;
  languageCode?: string;
  showAll?: boolean;
  pageSize?: number;
  pageToken?: string;
}

/**
 * `attributes.list` — https://developers.google.com/my-business/reference/businessinformation/rest/v1/attributes/list
 *
 * The metadata catalog for what `update-location-attributes` can set — which
 * attributes exist and how to interpret them, scoped either to a specific
 * location (`parent`), a category (`categoryName` + `regionCode` +
 * `languageCode`), or the entire catalog (`showAll` + `regionCode` +
 * `languageCode`). Exactly one of those scopes must be supplied.
 */
const listAttributeMetadata: ActionDefinition<Input> = {
  key: "list-attribute-metadata",
  type: "read",
  resource: "location",
  title: "List Attribute Metadata",
  description:
    "List the attributes available to set for a location, category, or the entire catalog — supply exactly one of Location, Category, or Show all.",
  params: [
    {
      key: "parent",
      label: "Location",
      type: "string",
      hint: "locations/{location_id}. If set, category/region/language/showAll must not be.",
    },
    {
      key: "categoryName",
      label: "Category",
      type: "string",
      hint: "categories/{category_id}, e.g. categories/gcid:restaurant.",
    },
    { key: "regionCode", label: "Region code (CLDR)", type: "string", placeholder: "US" },
    { key: "languageCode", label: "Language (BCP-47)", type: "string", default: "en" },
    { key: "showAll", label: "Show all attributes", type: "boolean", default: false },
    { key: "pageSize", label: "Page size", type: "number", default: 200 },
    { key: "pageToken", label: "Page token", type: "string" },
  ],
  output: [
    { key: "attributeMetadata", type: "array", label: "Attribute metadata" },
    { key: "nextPageToken", type: "string", label: "Next page token" },
  ],

  execute(input, ctx) {
    const client = new GoogleBusinessProfileClient(ctx);
    return client.request(BUSINESS_INFORMATION_URL, "/attributes", {
      query: {
        parent: input.parent,
        categoryName: input.categoryName,
        regionCode: input.regionCode,
        languageCode: input.languageCode,
        showAll: input.showAll,
        pageSize: input.pageSize ?? 200,
        pageToken: input.pageToken,
      },
    });
  },
};

export default listAttributeMetadata;
