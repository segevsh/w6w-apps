import type { ActionDefinition } from "@w6w/types";
import { encodeId, HospitableClient } from "../lib/client.ts";
import { includeParam, PAGED, PAGED_OUTPUT } from "../lib/params.ts";

/** `GET /v2/properties/{uuid}/reviews` — Guest reviews left for a property. */
interface Input {
  uuid: string;
  include?: string;
  page?: number;
  per_page?: number;
}

const propertyReviewsList: ActionDefinition<Input> = {
  key: "property-reviews-list",
  type: "search",
  resource: "review",
  title: "List Property Reviews",
  description: "List the reviews guests have left for a property, paginated. Needs reviews:read.",
  params: [
    { key: "uuid", label: "Property UUID", type: "string", required: true },
    includeParam("guest"),
    ...PAGED,
  ],
  output: PAGED_OUTPUT,

  execute(input, ctx) {
    return new HospitableClient(ctx).request("GET", `/properties/${encodeId(input.uuid)}/reviews`, {
      query: { include: input.include, page: input.page, per_page: input.per_page },
    });
  },
};

export default propertyReviewsList;
