import type { ActionDefinition } from "@w6w/types";
import { API_V1, csvIds, SquarespaceClient } from "../lib/client.ts";
import { csvIdsParam } from "../lib/params.ts";

/**
 * `GET /1.0/profiles/{profileIdCsvs}` — specific profiles.
 *
 * Comma-separated profile ids in the path, answering `{profiles: [...]}` with
 * no pagination. Note that this route does **not** state a ceiling of 50 the way
 * the inventory, product and transaction id routes do, so no limit is enforced
 * here — the vendor's own error is the authority.
 *
 * The ids are the `customerId` values an order carries and the `id` values
 * `list-profiles` returns.
 */
export interface ProfileListResponse {
  profiles?: Array<Record<string, unknown>>;
}

interface Input {
  profileIds: string;
}

const getProfiles: ActionDefinition<Input, ProfileListResponse> = {
  key: "get-profiles",
  type: "read",
  resource: "profile",
  title: "Get Profiles",
  description: "Retrieve specific customer profiles by comma-separated id.",
  params: [
    csvIdsParam(
      "profileIds",
      "Profile ids",
      "Profile ids to retrieve, e.g. an order's `customerId`.",
    ),
  ],
  output: [{
    key: "profiles",
    type: "array",
    label: "Profiles (`id`, `email`, `firstName`, `lastName`, `isCustomer`, `hasAccount`, " +
      "`transactionsSummary`)",
  }],

  execute(input, ctx) {
    const profileIds = csvIds(input.profileIds, { label: "profileIds" });
    return new SquarespaceClient(ctx).get<ProfileListResponse>(
      `${API_V1}/profiles/${profileIds}`,
    );
  },
};

export default getProfiles;
