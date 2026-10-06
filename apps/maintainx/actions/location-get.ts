import type { ActionDefinition } from "@w6w/types";
import { encodeId, MaintainXClient } from "../lib/client.ts";
import { idParam, organizationIdParam } from "../lib/params.ts";

/** `GET /v1/locations/{id}` — wraps the entity as `{ location }`; unwrapped here. */
interface Input {
  locationId: number;
  organizationId?: number;
}

const locationGet: ActionDefinition<Input> = {
  key: "location-get",
  type: "read",
  resource: "location",
  title: "Get Location",
  description: "Fetch one location by id.",
  params: [idParam("locationId", "Location ID"), organizationIdParam],
  output: [{ key: "data", type: "object", label: "The location" }],

  execute(input, ctx) {
    return new MaintainXClient(ctx).entity(`/locations/${encodeId(input.locationId)}`, "location", {
      organizationId: input.organizationId,
    });
  },
};

export default locationGet;
