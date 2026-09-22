import type { ActionDefinition } from "@w6w/types";
import { API_V1, SquarespaceClient } from "../lib/client.ts";
import { options, paginationOutput } from "../lib/params.ts";

/**
 * `GET /1.0/profiles` — up to 50 customer profiles.
 *
 * ## Maintenance mode, stated by the vendor
 *
 * The Profiles API's own pages carry a maintenance notice: new integrations are
 * directed to a Contacts API that this app deliberately does not implement
 * (it is outside this app's Commerce-only scope, and outside the contract it was
 * built to). Profiles remain fully live, so they are implemented as documented —
 * an order's `customerId` is a profile id, and `transactionsSummary` is the only
 * per-customer order/donation roll-up this API publishes.
 *
 * ## Two combining rules, both enforced here
 *
 *  - The `filter` param is a semicolon-separated list of `isCustomer`,
 *    `hasAccount` and `email` terms. The **`email` query parameter cannot be
 *    combined with `isCustomer`/`hasAccount`** — the vendor's own restriction, so
 *    the action rejects the combination rather than letting the API answer 400.
 *  - **`cursor` cannot be combined with anything else** on this endpoint, so a
 *    cursor plus any filter, sort or email is rejected too.
 */
const SORT_FIELDS = ["createdOn", "id", "email", "lastName"] as const;
const SORT_DIRECTIONS = ["asc", "dsc"] as const;

export interface Profile {
  acceptsMarketing?: boolean;
  address?: Record<string, unknown>;
  createdOn?: string;
  email?: string;
  firstName?: string;
  hasAccount?: boolean;
  id?: string;
  isCustomer?: boolean;
  lastName?: string;
  transactionsSummary?: Record<string, unknown>;
}

export interface ProfileListResponse {
  pagination?: { hasNextPage?: boolean; nextPageCursor?: string; nextPageUrl?: string };
  profiles?: Profile[];
}

interface Input {
  cursor?: string;
  sortDirection?: string;
  sortField?: string;
  filter?: string;
  email?: string;
}

const listProfiles: ActionDefinition<Input, ProfileListResponse> = {
  key: "list-profiles",
  type: "search",
  resource: "profile",
  title: "List Profiles",
  description:
    "List up to 50 customer profiles with their contact details and order summary. Note the " +
    "vendor's maintenance notice: this API stays live, but new integrations are pointed at " +
    "its Contacts API instead.",
  params: [
    {
      key: "cursor",
      label: "Cursor",
      type: "string",
      advanced: true,
      hint: "Opaque cursor from the previous page's `pagination.nextPageCursor`. On this " +
        "endpoint it cannot be combined with a filter, an email or a sort.",
    },
    {
      key: "filter",
      label: "Filter",
      type: "string",
      advanced: true,
      placeholder: "isCustomer;hasAccount",
      hint: "Semicolon-separated terms from `isCustomer`, `hasAccount` and `email`.",
    },
    {
      key: "email",
      label: "Email",
      type: "string",
      advanced: true,
      hint: "Exact email match. Cannot be combined with the `isCustomer`/`hasAccount` filters.",
    },
    {
      key: "sortField",
      label: "Sort field",
      type: "select",
      advanced: true,
      options: options(SORT_FIELDS),
    },
    {
      key: "sortDirection",
      label: "Sort direction",
      type: "select",
      advanced: true,
      options: options(SORT_DIRECTIONS),
      hint: "`dsc` is the vendor's own spelling, not a typo of ours.",
    },
  ],
  output: [paginationOutput, {
    key: "profiles",
    type: "array",
    label: "Profiles (`id`, `email`, `firstName`, `lastName`, `isCustomer`, `hasAccount`, " +
      "`acceptsMarketing`, `address`, `transactionsSummary`)",
  }],

  execute(input, ctx) {
    const cursor = input.cursor?.trim() || undefined;
    const filter = input.filter?.trim() || undefined;
    const email = input.email?.trim() || undefined;

    if (cursor && (filter || email || input.sortField || input.sortDirection)) {
      throw new Error(
        "`cursor` cannot be combined with a filter, an email or a sort on List profiles — drop " +
          "one or the other",
      );
    }
    if (email && /isCustomer|hasAccount/i.test(filter ?? "")) {
      throw new Error(
        "the `email` parameter cannot be combined with the `isCustomer`/`hasAccount` filters — " +
          "Squarespace rejects the pair",
      );
    }

    return new SquarespaceClient(ctx).get<ProfileListResponse>(`${API_V1}/profiles`, {
      cursor,
      filter,
      email,
      sortField: input.sortField,
      sortDirection: input.sortDirection,
    });
  },
};

export default listProfiles;
