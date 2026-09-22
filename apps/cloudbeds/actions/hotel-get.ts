import type { ActionDefinition } from "@w6w/types";
import { CloudbedsClient, type CloudbedsEnvelope } from "../lib/client.ts";
import { propertyIdParam } from "../lib/params.ts";

/**
 * `GET /getHotelDetails` — one property's full configuration.
 *
 * `propertyID` is optional, and omitting it is not the same as passing the
 * credential's own id: the vendor says the request then resolves against the
 * token's default property, which is the only way to read a single-property
 * credential without knowing the id in advance.
 *
 * The body is the usual `{success, data}` and `data` is the whole property
 * record — settings, address, currency, taxes and the rest. The operation's
 * schema types it only as `object` and publishes no properties, so there is
 * nothing honest to project into declared output fields; the whole envelope is
 * returned instead, exactly as `hotel-list` returns its page.
 */
interface Input {
  propertyID?: string;
}

const hotelGet: ActionDefinition<Input> = {
  key: "hotel-get",
  type: "read",
  resource: "hotel",
  title: "Get Property",
  description: "Get the full details of one Cloudbeds property.",
  params: [propertyIdParam],
  output: [
    { key: "data", type: "object", label: "Property details" },
    { key: "success", type: "boolean", label: "Success" },
  ],

  execute(input, ctx) {
    return new CloudbedsClient(ctx).request<CloudbedsEnvelope<Record<string, unknown>>>(
      "/getHotelDetails",
      { query: { propertyID: input.propertyID } },
    );
  },
};

export default hotelGet;
