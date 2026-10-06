import type { ActionDefinition } from "@w6w/types";
import { HospitableClient } from "../lib/client.ts";
import { includeParam, PAGED, PAGED_OUTPUT } from "../lib/params.ts";

/** `GET /v2/teammates` — Internal teammates on the account. */
interface Input {
  service_id?: number;
  property_id?: string;
  include?: string;
  page?: number;
  per_page?: number;
}

const teammateList: ActionDefinition<Input> = {
  key: "teammate-list",
  type: "search",
  resource: "teammate",
  title: "List Teammates",
  description:
    "List the account's internal teammates; use it to find a teammate UUID for Create/Update Task. Needs teammate:read.",
  params: [
    {
      key: "service_id",
      label: "Service ID",
      type: "number",
      hint: "Service id 1-8; only teammates who perform it (plus those scoped to all services).",
      validation: { integer: true, min: 1, max: 8 },
    },
    {
      key: "property_id",
      label: "Property UUID",
      type: "string",
      hint: "Only teammates scoped to this property (plus those scoped to all).",
    },
    includeParam("properties"),
    ...PAGED,
  ],
  output: PAGED_OUTPUT,

  execute(input, ctx) {
    return new HospitableClient(ctx).request("GET", "/teammates", {
      query: {
        service_id: input.service_id,
        property_id: input.property_id,
        include: input.include,
        page: input.page,
        per_page: input.per_page,
      },
    });
  },
};

export default teammateList;
