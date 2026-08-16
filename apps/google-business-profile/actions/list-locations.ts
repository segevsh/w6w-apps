import type { ActionDefinition } from "@w6w/types";
import {
  accountName,
  BUSINESS_INFORMATION_URL,
  GoogleBusinessProfileClient,
} from "../lib/client.ts";

interface Input {
  accountId: string;
  readMask?: string;
  pageSize?: number;
  pageToken?: string;
  filter?: string;
  orderBy?: string;
}

const DEFAULT_READ_MASK =
  "name,title,storefrontAddress,phoneNumbers,websiteUri,regularHours,latlng,openInfo,profile,categories,metadata";

/**
 * `accounts.locations.list` — https://developers.google.com/my-business/reference/businessinformation/rest/v1/accounts.locations/list
 *
 * `readMask` is required by the API (not just this action) — Google returns
 * only the fields you name, so a caller who wants everything must say so
 * explicitly. Defaults to a set covering the common fields.
 */
const listLocations: ActionDefinition<Input> = {
  key: "list-locations",
  type: "read",
  resource: "location",
  title: "List Locations",
  description:
    "List the locations owned by an account. For a PERSONAL account, returns only directly owned locations; for other account types (e.g. a location group), returns all accessible locations.",
  params: [
    {
      key: "accountId",
      label: "Account ID",
      type: "string",
      required: true,
      hint:
        "The bare ID or full resource name (accounts/1234567890). Use accounts/- for all locations accessible to the connected user.",
    },
    {
      key: "readMask",
      label: "Read mask",
      type: "string",
      required: true,
      default: DEFAULT_READ_MASK,
      hint: "Comma-separated list of Location field paths to return.",
    },
    { key: "pageSize", label: "Page size", type: "number", default: 100 },
    { key: "pageToken", label: "Page token", type: "string" },
    {
      key: "filter",
      label: "Filter",
      type: "string",
      hint: 'e.g. `title="Google Sydney"` or `storeCode="12345"`.',
    },
    { key: "orderBy", label: "Order by", type: "string", hint: "e.g. `title desc`." },
  ],
  output: [
    { key: "locations", type: "array", label: "Locations" },
    { key: "nextPageToken", type: "string", label: "Next page token" },
    { key: "totalSize", type: "number", label: "Total size" },
  ],

  execute(input, ctx) {
    const client = new GoogleBusinessProfileClient(ctx);
    return client.request(
      BUSINESS_INFORMATION_URL,
      `/${accountName(input.accountId)}/locations`,
      {
        query: {
          readMask: input.readMask ?? DEFAULT_READ_MASK,
          pageSize: input.pageSize ?? 100,
          pageToken: input.pageToken,
          filter: input.filter,
          orderBy: input.orderBy,
        },
      },
    );
  },
};

export default listLocations;
