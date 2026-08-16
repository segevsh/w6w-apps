import type { ActionDefinition } from "@w6w/types";
import { BUSINESS_INFORMATION_URL, GoogleBusinessProfileClient } from "../lib/client.ts";

interface Input {
  regionCode: string;
  languageCode: string;
  view: "BASIC" | "FULL";
  filter?: string;
  pageSize?: number;
  pageToken?: string;
}

/**
 * `categories.list` — https://developers.google.com/my-business/reference/businessinformation/rest/v1/categories/list
 *
 * Returns Google's supported business categories (used for
 * `categories.primaryCategory`/`additionalCategories` on a Location).
 * `regionCode` and `languageCode` are required — category availability and
 * display names are localized.
 */
const listCategories: ActionDefinition<Input> = {
  key: "list-categories",
  type: "read",
  resource: "category",
  title: "List Categories",
  description: "List Google's supported business categories, localized to a region and language.",
  params: [
    {
      key: "regionCode",
      label: "Region code (CLDR)",
      type: "string",
      required: true,
      placeholder: "US",
    },
    {
      key: "languageCode",
      label: "Language (BCP-47)",
      type: "string",
      required: true,
      default: "en",
    },
    {
      key: "view",
      label: "View",
      type: "select",
      required: true,
      default: "BASIC",
      options: [
        { value: "BASIC", label: "Basic (display name, category ID, language)" },
        { value: "FULL", label: "Full (includes service type metadata)" },
      ],
    },
    {
      key: "filter",
      label: "Filter",
      type: "string",
      hint: "e.g. `displayName=coffee shop`. See the API reference for the full filter grammar.",
    },
    { key: "pageSize", label: "Page size", type: "number", default: 100 },
    { key: "pageToken", label: "Page token", type: "string" },
  ],
  output: [
    { key: "categories", type: "array", label: "Categories" },
    { key: "nextPageToken", type: "string", label: "Next page token" },
  ],

  execute(input, ctx) {
    const client = new GoogleBusinessProfileClient(ctx);
    return client.request(BUSINESS_INFORMATION_URL, "/categories", {
      query: {
        regionCode: input.regionCode,
        languageCode: input.languageCode,
        view: input.view ?? "BASIC",
        filter: input.filter,
        pageSize: input.pageSize ?? 100,
        pageToken: input.pageToken,
      },
    });
  },
};

export default listCategories;
