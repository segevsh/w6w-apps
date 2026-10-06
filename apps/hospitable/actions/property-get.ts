import type { ActionDefinition } from "@w6w/types";
import { encodeId, HospitableClient } from "../lib/client.ts";
import { includeParam, ONE_OUTPUT } from "../lib/params.ts";

/** `GET /v2/properties/{uuid}` — Get one property. */
interface Input {
  uuid: string;
  include?: string;
}

const propertyGet: ActionDefinition<Input> = {
  key: "property-get",
  type: "read",
  resource: "property",
  title: "Get Property",
  description: "Get a property by UUID.",
  params: [
    { key: "uuid", label: "Property UUID", type: "string", required: true },
    includeParam(
      "listings, owners",
      "`listings` needs the listing:read scope; `owners` owner:read.",
    ),
  ],
  output: ONE_OUTPUT,

  execute(input, ctx) {
    return new HospitableClient(ctx).request("GET", `/properties/${encodeId(input.uuid)}`, {
      query: { include: input.include },
    });
  },
};

export default propertyGet;
