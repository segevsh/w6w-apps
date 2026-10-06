import type { ActionDefinition } from "@w6w/types";
import { HospitableClient } from "../lib/client.ts";
import { includeParam, PAGED, PAGED_OUTPUT } from "../lib/params.ts";

/** `GET /v2/properties` — List the account's properties. */
interface Input {
  include?: string;
  page?: number;
  per_page?: number;
}

const propertyList: ActionDefinition<Input> = {
  key: "property-list",
  type: "search",
  resource: "property",
  title: "List Properties",
  description: "List the properties on the account, paginated.",
  params: [
    includeParam(
      "listings, owners",
      "`listings` needs the listing:read scope; `owners` owner:read.",
    ),
    ...PAGED,
  ],
  output: PAGED_OUTPUT,

  execute(input, ctx) {
    return new HospitableClient(ctx).request("GET", "/properties", {
      query: { include: input.include, page: input.page, per_page: input.per_page },
    });
  },
};

export default propertyList;
